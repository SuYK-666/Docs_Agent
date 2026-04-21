import { NavbarHero } from '@/components/ui/hero-with-video'

export default function LandingPage() {
  return (
    <NavbarHero
      brandName="NexusOps"
      heroTitle="文档智能体运行中枢"
      heroSubtitle="实时编排 / 协同执行 / 数据闭环"
      heroDescription="这是系统的登录与引导首页。后续我们会继续把旧 Vue 项目的上传、图表、工作流和审批能力拆分进对应页面。"
      backgroundImage="https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=2072&q=80"
    />
  )
}
