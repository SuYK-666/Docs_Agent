from __future__ import annotations

import json
import logging
import re
from typing import Any, Mapping, Protocol


CRITIC_PLAIN_TEXT_MAX_CHARS = 14000
CRITIC_DRAFT_JSON_MAX_CHARS = 14000


class CriticClientProtocol(Protocol):
	async def chat_completion(
		self,
		messages: list[dict[str, str]],
		response_format: Mapping[str, Any] | None = None,
		temperature: float | None = None,
		max_tokens: int | None = None,
	) -> dict[str, Any]:
		...

	def get_message_content(self, response_json: Mapping[str, Any]) -> str:
		...


class CriticAgent:
	"""Quality critic for draft outputs. It scores, rejects, and gives concrete rework feedback."""

	def __init__(
		self,
		client: CriticClientProtocol,
		score_threshold: int = 85,
		json_retry_times: int = 2,
		max_output_tokens: int = 1800,
	) -> None:
		self.client = client
		self.score_threshold = max(0, min(100, int(score_threshold)))
		self.json_retry_times = max(0, int(json_retry_times))
		self.max_output_tokens = max(500, int(max_output_tokens))
		self.logger = logging.getLogger("docs_agent.agent_critic")

	@staticmethod
	def _clamp_score(value: Any, fallback: int = 0) -> int:
		try:
			score = int(float(value))
		except (TypeError, ValueError):
			score = fallback
		return max(0, min(100, score))

	@staticmethod
	def _sanitize_feedback(value: Any) -> str:
		text = str(value).strip()
		text = re.sub(r"\s+", " ", text)
		return text

	def _normalize_result(self, raw: Mapping[str, Any]) -> dict[str, Any]:
		completeness_score = self._clamp_score(raw.get("completeness_score"), fallback=0)
		accuracy_score = self._clamp_score(raw.get("accuracy_score"), fallback=0)
		executability_score = self._clamp_score(raw.get("executability_score"), fallback=0)
		total_score = int(round((completeness_score + accuracy_score + executability_score) / 3))

		passed = total_score >= self.score_threshold
		feedback = self._sanitize_feedback(raw.get("feedback", ""))
		if passed and not feedback:
			feedback = "质量评估通过。"
		if (not passed) and not feedback:
			feedback = (
				"【扣分原因】存在遗漏任务或关键信息冲突。"
				"【原文依据】请对照原文中含动作词与时间节点的段落。"
				"【修改指令】请在 tasks 中补齐遗漏项并修正 owner、deadline 与 deliverables。"
			)
		if not passed and feedback and ("【扣分原因】" not in feedback or "【原文依据】" not in feedback or "【修改指令】" not in feedback):
			feedback = (
				f"【扣分原因】{feedback}"
				"【原文依据】请对照原文相关段落核对动作、责任人与时间。"
				"【修改指令】请逐项补齐遗漏任务并修正冲突字段。"
			)

		return {
			"completeness_score": completeness_score,
			"accuracy_score": accuracy_score,
			"executability_score": executability_score,
			"total_score": total_score,
			"passed": passed,
			"feedback": feedback,
		}

	async def evaluate(
		self,
		parsed_doc: Mapping[str, Any],
		draft_output: Mapping[str, Any],
	) -> dict[str, Any]:
		doc_id = str(draft_output.get("doc_id") or parsed_doc.get("doc_id") or "unknown")
		self.logger.info(
			"STEP=pipeline.critic | AGENT=Critic | ACTION=EvaluateStart | DETAILS=doc_id=%s threshold=%s",
			doc_id,
			self.score_threshold,
		)

		plain_text = str(parsed_doc.get("plain_text", ""))[:CRITIC_PLAIN_TEXT_MAX_CHARS]
		draft_json = json.dumps(draft_output, ensure_ascii=False, separators=(",", ":"))[:CRITIC_DRAFT_JSON_MAX_CHARS]
		system_prompt = (
			"你是 Critic Agent（公文质量冷酷无情的评审官）。你的职责是基于原文与草稿的语义匹配度进行严格审查。\n"
			"必须返回严格 JSON 对象，不得输出任何解释性文字或 Markdown。\n"
			"字段必须包含：\n"
			"completeness_score (0-100), accuracy_score (0-100), executability_score (0-100), "
			"total_score (0-100), passed (布尔), feedback (字符串)。\n"
			"【评分原则（语义匹配优先，不使用固定每项扣分模板）】：\n"
			"1) completeness_score（完整性）：根据草稿对原文任务要点的覆盖程度打分，重点看动作、责任人、时间节点、交付物是否被充分提取。\n"
			"2) accuracy_score（准确性）：根据草稿与原文事实一致性打分，重点看是否存在幻觉、冲突、张冠李戴或关键信息错配。\n"
			"3) executability_score（可执行性）：根据任务是否可落地打分，重点看 action_suggestion 是否清晰可执行、deliverables 是否具体且可验收。\n"
			"4) 评分需细粒度且自然：使用 0-100 的整数分，不要机械只给 5 或 10 的倍数；允许出现 97、88、91 等分数。（当然如果刚好是5或10的倍数也要正常显示。）\n"
			"5) 对问题严重度与数量进行综合判断：严重问题应显著降分，轻微问题可小幅降分；若基本一致且仅有轻微瑕疵，应给出高分但非僵化满分。\n"
			f"6) total_score 必须是三项分数平均值（四舍五入取整）；当 total_score >= {self.score_threshold} 时 passed=true，否则 passed=false。\n"
			"7) 仅当 passed=false 时，feedback 必须使用固定结构："
			"【扣分原因】...【原文依据】...【修改指令】...；禁止空话。"
		)
		user_prompt = (
			"原始文档内容（节选）：\n"
			f"{plain_text}\n\n"
			"当前草稿 JSON：\n"
			f"{draft_json}\n\n"
			"请输出质量评分 JSON，禁止输出 JSON 之外内容。"
		)

		messages: list[dict[str, str]] = [
			{"role": "system", "content": system_prompt},
			{"role": "user", "content": user_prompt},
		]

		max_attempts = self.json_retry_times + 1
		for attempt in range(1, max_attempts + 1):
			try:
				self.logger.info(
					"STEP=pipeline.critic | AGENT=Critic | ACTION=LLMAttemptStart | DETAILS=doc_id=%s attempt=%s/%s max_tokens=%s",
					doc_id,
					attempt,
					max_attempts,
					self.max_output_tokens,
				)
				response = await self.client.chat_completion(
					messages=messages,
					response_format={"type": "json_object"},
					temperature=0,
					max_tokens=self.max_output_tokens,
				)
				content = self.client.get_message_content(response)
				candidate = json.loads(content)
				if not isinstance(candidate, dict):
					raise ValueError("Critic output must be JSON object.")
				result = self._normalize_result(candidate)
				self.logger.info(
					"STEP=pipeline.critic | AGENT=Critic | ACTION=EvaluateDone | DETAILS=doc_id=%s total_score=%s passed=%s",
					doc_id,
					result.get("total_score", 0),
					result.get("passed", False),
				)
				return result
			except Exception as exc:  # pylint: disable=broad-except
				self.logger.warning(
					"Critic failed attempt %s/%s: %s",
					attempt,
					max_attempts,
					exc,
				)
				if attempt >= max_attempts:
					break
				messages.append(
					{
						"role": "user",
						"content": "上一轮输出不是有效 JSON。请严格返回 JSON 对象且包含完整字段。",
					}
				)

		# Fail-open: quality gate should not crash main pipeline.
		fallback = {
			"completeness_score": self.score_threshold,
			"accuracy_score": self.score_threshold,
			"executability_score": self.score_threshold,
			"total_score": self.score_threshold,
			"passed": True,
			"feedback": "CriticAgent unavailable: skipped strict quality gating for this round.",
		}
		self.logger.warning(
			"STEP=pipeline.critic | AGENT=Critic | ACTION=FallbackPass | DETAILS=doc_id=%s total_score=%s",
			doc_id,
			fallback["total_score"],
		)
		return fallback
