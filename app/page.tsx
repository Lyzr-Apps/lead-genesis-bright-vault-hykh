'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { listSchedules, getSchedule, getScheduleLogs, pauseSchedule, resumeSchedule, triggerScheduleNow, cronToHuman, type Schedule, type ExecutionLog } from '@/lib/scheduler'
import parseLLMJson from '@/lib/jsonParser'
import { cn } from '@/lib/utils'

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
// Tabs available but using custom sidebar navigation

import { HiOutlineHome, HiOutlineRocketLaunch, HiOutlineEnvelopeOpen, HiOutlineCalendarDays, HiOutlineCog6Tooth } from 'react-icons/hi2'
import { FiUsers, FiMail, FiPhone, FiCheckCircle, FiXCircle, FiClock, FiActivity, FiChevronLeft, FiChevronRight, FiChevronDown, FiChevronUp, FiSend, FiRefreshCw, FiPause, FiPlay, FiZap, FiSearch, FiPlus, FiExternalLink, FiAlertCircle, FiLoader, FiTarget, FiTrendingUp, FiEdit2, FiCalendar, FiLink } from 'react-icons/fi'

// =====================================================================
// TYPES
// =====================================================================

interface LeadEmail {
  company_name: string
  industry: string
  employee_count: string
  revenue_range: string
  signals: string[]
  qualification_score: number
  decision_maker_name: string
  decision_maker_title: string
  decision_maker_email: string
  company_website: string
  rationale: string
  email_subject: string
  email_body: string
  personalization_notes: string
}

interface FollowUpLead {
  prospect_email: string
  prospect_name: string
  company_name: string
  category: string
  reply_snippet: string
  last_contact_date: string
  followup_draft_subject: string
  followup_draft_body: string
  urgency: string
}

interface ScheduledCall {
  event_title: string
  prospect_name: string
  prospect_email: string
  company_name: string
  scheduled_date: string
  scheduled_time: string
  duration_minutes: number
  meeting_link: string
  calendar_name: string
  agenda: string
}

interface Campaign {
  id: string
  name: string
  industry: string
  totalLeads: number
  emailsSent: number
  createdAt: string
  status: string
}

interface Activity {
  id: string
  action: string
  detail: string
  timestamp: string
  agentName: string
}

interface CallFormData {
  prospect_email: string
  prospect_name: string
  company_name: string
  preferred_date: string
  preferred_time: string
  duration: string
  agenda: string
}

// =====================================================================
// CONSTANTS
// =====================================================================

const AGENT_IDS = {
  CAMPAIGN_COORDINATOR: '6998b42347a42b7319aeac6e',
  EMAIL_DELIVERY: '6998b47f2487dbb79e800782',
  FOLLOW_UP_TRACKER: '6998b47f61ca1802d718506b',
  CALL_SCHEDULER: '6998b48047a42b7319aeac7a',
} as const

const SCHEDULE_ID = '6998b48a399dfadeac37d3a1'

const INDUSTRIES = ['SaaS', 'B2B Tech', 'Fintech', 'Healthtech', 'E-commerce', 'EdTech']
const SIGNALS = ['Job Postings', 'Funding Rounds', 'Revenue Growth', 'Content Activity']
const COMPANY_SIZES = ['50-100', '100-250', '250-500', '500+']

const SAMPLE_LEADS: LeadEmail[] = [
  {
    company_name: 'TechFlow Solutions',
    industry: 'SaaS',
    employee_count: '150-200',
    revenue_range: '$10M-$25M',
    signals: ['Funding Rounds', 'Job Postings'],
    qualification_score: 85,
    decision_maker_name: 'Sarah Chen',
    decision_maker_title: 'VP of Marketing',
    decision_maker_email: 'sarah.chen@techflow.io',
    company_website: 'https://techflow.io',
    rationale: 'Recently raised Series B with strong growth trajectory. Expanding marketing team indicates need for video content.',
    email_subject: 'Elevate TechFlow\'s Brand with Professional Video Production',
    email_body: 'Hi Sarah,\n\nCongratulations on TechFlow\'s recent Series B round! As you scale your marketing team, I wanted to share how our video production services have helped similar SaaS companies increase conversion rates by 40%.\n\nWould you be open to a quick 15-minute call this week?\n\nBest regards',
    personalization_notes: 'Reference Series B funding, mention SaaS-specific video case studies',
  },
  {
    company_name: 'DataBridge Analytics',
    industry: 'B2B Tech',
    employee_count: '250-350',
    revenue_range: '$25M-$50M',
    signals: ['Revenue Growth', 'Content Activity'],
    qualification_score: 72,
    decision_maker_name: 'Michael Torres',
    decision_maker_title: 'Director of Content',
    decision_maker_email: 'mtorres@databridge.com',
    company_website: 'https://databridge.com',
    rationale: 'Active content publishing suggests investment in content marketing. Video would complement their blog strategy.',
    email_subject: 'Transform DataBridge\'s Content Strategy with Video',
    email_body: 'Hi Michael,\n\nI\'ve been following DataBridge\'s impressive content output. Your recent blog series on data analytics best practices was excellent.\n\nMany B2B tech companies we work with have found that adding video to their content mix increases engagement by 3x. I\'d love to discuss how we could help DataBridge achieve similar results.\n\nWould a brief call next week work for you?',
    personalization_notes: 'Reference their blog content, B2B tech angle',
  },
  {
    company_name: 'FinSecure Pro',
    industry: 'Fintech',
    employee_count: '100-150',
    revenue_range: '$5M-$15M',
    signals: ['Job Postings', 'Revenue Growth'],
    qualification_score: 91,
    decision_maker_name: 'Amanda Reeves',
    decision_maker_title: 'CMO',
    decision_maker_email: 'areeves@finsecure.pro',
    company_website: 'https://finsecure.pro',
    rationale: 'Hiring for multiple marketing roles signals growth. Fintech compliance video content is a growing need.',
    email_subject: 'Video Content for FinSecure Pro\'s Growth Phase',
    email_body: 'Hi Amanda,\n\nI noticed FinSecure Pro is expanding its marketing team -- exciting times! At this growth stage, video content becomes critical for building trust in the fintech space.\n\nWe specialize in compliance-friendly video production for financial services. Our clients typically see a 50% improvement in prospect engagement.\n\nCould we schedule a quick discovery call?',
    personalization_notes: 'Compliance angle for fintech, reference hiring activity',
  },
]

const SAMPLE_FOLLOWUPS: FollowUpLead[] = [
  {
    prospect_email: 'sarah.chen@techflow.io',
    prospect_name: 'Sarah Chen',
    company_name: 'TechFlow Solutions',
    category: 'interested',
    reply_snippet: 'This sounds interesting! We\'re actually looking into video for our product demos. Can you share some examples?',
    last_contact_date: '2025-01-15',
    followup_draft_subject: 'Re: Video Production Portfolio for TechFlow',
    followup_draft_body: 'Hi Sarah,\n\nThank you for your interest! I\'d love to share our portfolio. Here are some product demo videos we\'ve created for similar SaaS companies.\n\nWould Thursday at 2pm work for a quick walkthrough?',
    urgency: 'high',
  },
  {
    prospect_email: 'mtorres@databridge.com',
    prospect_name: 'Michael Torres',
    company_name: 'DataBridge Analytics',
    category: 'needs_followup',
    reply_snippet: '',
    last_contact_date: '2025-01-13',
    followup_draft_subject: 'Following up: Video for DataBridge\'s Content Strategy',
    followup_draft_body: 'Hi Michael,\n\nI wanted to follow up on my previous message about video content for DataBridge. I\'ve put together a brief case study showing how similar B2B companies increased content engagement.\n\nWould you have 10 minutes to discuss?',
    urgency: 'medium',
  },
  {
    prospect_email: 'jlee@horizonhealth.co',
    prospect_name: 'Jennifer Lee',
    company_name: 'Horizon Healthtech',
    category: 'needs_followup',
    reply_snippet: '',
    last_contact_date: '2025-01-10',
    followup_draft_subject: 'Quick follow-up: Healthcare video production',
    followup_draft_body: 'Hi Jennifer,\n\nI wanted to check in about our previous conversation regarding video content for Horizon. We recently completed a project for a similar healthtech firm that I think you\'d find relevant.\n\nWould you be available for a brief call this week?',
    urgency: 'low',
  },
]

const SAMPLE_CALLS: ScheduledCall[] = [
  {
    event_title: 'Discovery Call - TechFlow Solutions',
    prospect_name: 'Sarah Chen',
    prospect_email: 'sarah.chen@techflow.io',
    company_name: 'TechFlow Solutions',
    scheduled_date: '2025-01-20',
    scheduled_time: '14:00',
    duration_minutes: 30,
    meeting_link: 'https://meet.google.com/abc-defg-hij',
    calendar_name: 'Work Calendar',
    agenda: 'Discuss video production for product demos, share portfolio examples, explore partnership opportunities',
  },
]

// =====================================================================
// HELPERS
// =====================================================================

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part)
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-green-600'
  if (score >= 40) return 'text-amber-600'
  return 'text-red-500'
}

function getScoreBg(score: number): string {
  if (score >= 70) return 'bg-green-500'
  if (score >= 40) return 'bg-amber-500'
  return 'bg-red-500'
}

function getUrgencyColor(urgency: string): string {
  if (urgency === 'high') return 'bg-red-100 text-red-700 border-red-200'
  if (urgency === 'medium') return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-slate-100 text-slate-600 border-slate-200'
}

function getSignalColor(signal: string): string {
  switch (signal) {
    case 'Funding Rounds': return 'bg-purple-100 text-purple-700 border-purple-200'
    case 'Job Postings': return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'Revenue Growth': return 'bg-green-100 text-green-700 border-green-200'
    case 'Content Activity': return 'bg-orange-100 text-orange-700 border-orange-200'
    default: return 'bg-secondary text-secondary-foreground'
  }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

// =====================================================================
// ERROR BOUNDARY
// =====================================================================

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button onClick={() => this.setState({ hasError: false, error: '' })} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">Try again</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// =====================================================================
// SUB-COMPONENTS
// =====================================================================

function MetricCard({ title, value, icon, trend }: { title: string; value: number; icon: React.ReactNode; trend?: string }) {
  return (
    <Card className="glass-panel border-border/50 shadow-md hover:shadow-lg transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground tracking-tight">{title}</p>
            <p className="text-3xl font-bold tracking-tight mt-1 font-mono">{value}</p>
            {trend && <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><FiTrendingUp className="h-3 w-3" />{trend}</p>}
          </div>
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBanner({ type, message, onDismiss }: { type: 'success' | 'error' | 'info'; message: string; onDismiss?: () => void }) {
  const colors = type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'
  return (
    <div className={cn('p-3 rounded-xl border flex items-center justify-between gap-2 text-sm', colors)}>
      <div className="flex items-center gap-2">
        {type === 'success' && <FiCheckCircle className="h-4 w-4 flex-shrink-0" />}
        {type === 'error' && <FiAlertCircle className="h-4 w-4 flex-shrink-0" />}
        {type === 'info' && <FiActivity className="h-4 w-4 flex-shrink-0" />}
        <span>{message}</span>
      </div>
      {onDismiss && <button onClick={onDismiss} className="text-current opacity-60 hover:opacity-100"><FiXCircle className="h-4 w-4" /></button>}
    </div>
  )
}

function LeadCard({ lead, index, selected, onToggle, onEdit, expanded, onExpand }: {
  lead: LeadEmail
  index: number
  selected: boolean
  onToggle: () => void
  onEdit: (field: 'email_subject' | 'email_body', value: string) => void
  expanded: boolean
  onExpand: () => void
}) {
  return (
    <Card className="glass-panel border-border/50 shadow-sm hover:shadow-md transition-all duration-300">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <Checkbox checked={selected} onCheckedChange={onToggle} className="mt-1" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-base tracking-tight">{lead.company_name}</h3>
                <p className="text-sm text-muted-foreground">{lead.decision_maker_name} -- {lead.decision_maker_title}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className={cn('text-sm font-bold font-mono', getScoreColor(lead.qualification_score))}>
                  {lead.qualification_score}
                </div>
                <div className="w-16">
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all', getScoreBg(lead.qualification_score))} style={{ width: `${lead.qualification_score}%` }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Badge variant="secondary" className="text-xs">{lead.industry}</Badge>
              <Badge variant="outline" className="text-xs font-mono">{lead.employee_count} emp</Badge>
              <Badge variant="outline" className="text-xs">{lead.revenue_range}</Badge>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {Array.isArray(lead.signals) && lead.signals.map((s, si) => (
                <span key={si} className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium', getSignalColor(s))}>{s}</span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{lead.rationale}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><FiMail className="h-3 w-3" />{lead.decision_maker_email}</span>
              {lead.company_website && (
                <a href={lead.company_website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                  <FiExternalLink className="h-3 w-3" />Website
                </a>
              )}
            </div>
            <button onClick={onExpand} className="flex items-center gap-1 text-xs text-primary mt-3 hover:underline font-medium">
              <FiEdit2 className="h-3 w-3" />
              {expanded ? 'Hide Email Draft' : 'View/Edit Email Draft'}
              {expanded ? <FiChevronUp className="h-3 w-3" /> : <FiChevronDown className="h-3 w-3" />}
            </button>
            {expanded && (
              <div className="mt-3 space-y-2 p-3 bg-muted/50 rounded-lg border border-border/50">
                <div>
                  <Label className="text-xs font-medium">Subject</Label>
                  <Input value={lead.email_subject} onChange={(e) => onEdit('email_subject', e.target.value)} className="mt-1 text-sm bg-background" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Body</Label>
                  <Textarea value={lead.email_body} onChange={(e) => onEdit('email_body', e.target.value)} rows={6} className="mt-1 text-sm bg-background font-mono text-xs leading-relaxed" />
                </div>
                {lead.personalization_notes && (
                  <p className="text-[10px] text-muted-foreground italic">Notes: {lead.personalization_notes}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function FollowUpCard({ lead, selected, onToggle, onEditDraft }: {
  lead: FollowUpLead
  selected: boolean
  onToggle: () => void
  onEditDraft: (field: 'followup_draft_subject' | 'followup_draft_body', value: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <Card className="glass-panel border-border/50 shadow-sm mb-3">
      <CardContent className="p-4">
        <div className="flex items-start gap-2">
          {lead.category === 'needs_followup' && <Checkbox checked={selected} onCheckedChange={onToggle} className="mt-1" />}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-semibold text-sm tracking-tight">{lead.company_name}</h4>
              <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium', getUrgencyColor(lead.urgency))}>{lead.urgency}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{lead.prospect_name} -- {lead.prospect_email}</p>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1"><FiClock className="h-3 w-3" />Last contact: {lead.last_contact_date}</p>
            {lead.reply_snippet && (
              <div className="mt-2 p-2 bg-muted/50 rounded-lg border border-border/50">
                <p className="text-xs italic text-foreground/80">"{lead.reply_snippet}"</p>
              </div>
            )}
            <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-primary mt-2 hover:underline font-medium">
              <FiEdit2 className="h-3 w-3" />
              {expanded ? 'Hide Draft' : 'View Follow-Up Draft'}
            </button>
            {expanded && (
              <div className="mt-2 space-y-2 p-3 bg-muted/30 rounded-lg border border-border/40">
                <div>
                  <Label className="text-xs font-medium">Subject</Label>
                  <Input value={lead.followup_draft_subject} onChange={(e) => onEditDraft('followup_draft_subject', e.target.value)} className="mt-1 text-sm bg-background" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Body</Label>
                  <Textarea value={lead.followup_draft_body} onChange={(e) => onEditDraft('followup_draft_body', e.target.value)} rows={5} className="mt-1 text-sm bg-background font-mono text-xs" />
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AgentStatusSection({ activeAgentId }: { activeAgentId: string | null }) {
  const agents = [
    { id: AGENT_IDS.CAMPAIGN_COORDINATOR, name: 'Lead Campaign Coordinator', purpose: 'Generates targeted lead campaigns with personalized emails' },
    { id: AGENT_IDS.EMAIL_DELIVERY, name: 'Email Delivery Agent', purpose: 'Sends outreach emails via Gmail' },
    { id: AGENT_IDS.FOLLOW_UP_TRACKER, name: 'Follow-Up Tracker', purpose: 'Scans inbox for replies, categorizes and drafts follow-ups' },
    { id: AGENT_IDS.CALL_SCHEDULER, name: 'Call Scheduler', purpose: 'Books discovery calls via Google Calendar' },
  ]
  return (
    <Card className="glass-panel border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold tracking-tight flex items-center gap-2"><FiActivity className="h-4 w-4 text-primary" />AI Agents</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {agents.map((agent) => (
            <div key={agent.id} className="flex items-center gap-2 text-xs">
              <div className={cn('h-2 w-2 rounded-full flex-shrink-0', activeAgentId === agent.id ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/30')} />
              <div className="flex-1 min-w-0">
                <span className="font-medium">{agent.name}</span>
                <span className="text-muted-foreground ml-1.5 hidden lg:inline">-- {agent.purpose}</span>
              </div>
              {activeAgentId === agent.id && <Badge variant="default" className="text-[9px] py-0 px-1.5 h-4">Active</Badge>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function LoadingOverlay({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-4 border-muted" />
        <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
      <p className="text-sm text-muted-foreground font-medium">{message}</p>
    </div>
  )
}

// =====================================================================
// MAIN PAGE
// =====================================================================

export default function Page() {
  // Navigation
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Sample data toggle
  const [showSampleData, setShowSampleData] = useState(false)

  // Dashboard
  const [metrics, setMetrics] = useState({ totalLeads: 0, emailsSent: 0, replies: 0, callsBooked: 0 })
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [activityLog, setActivityLog] = useState<Activity[]>([])

  // Campaign Builder
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([])
  const [companySize, setCompanySize] = useState('')
  const [selectedSignals, setSelectedSignals] = useState<string[]>([])
  const [volume, setVolume] = useState('10')
  const [generatedLeads, setGeneratedLeads] = useState<LeadEmail[]>([])
  const [selectedLeadIndices, setSelectedLeadIndices] = useState<Set<number>>(new Set())
  const [expandedLeadIndices, setExpandedLeadIndices] = useState<Set<number>>(new Set())
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [sendingProgress, setSendingProgress] = useState(0)
  const [campaignStatus, setCampaignStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  // Follow-Up Queue
  const [followUpLeads, setFollowUpLeads] = useState<FollowUpLead[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [selectedFollowUps, setSelectedFollowUps] = useState<Set<number>>(new Set())
  const [isSendingFollowUps, setIsSendingFollowUps] = useState(false)
  const [followUpStatus, setFollowUpStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  // Schedule Management
  const [trackerSchedule, setTrackerSchedule] = useState<Schedule | null>(null)
  const [scheduleLogs, setScheduleLogs] = useState<ExecutionLog[]>([])
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false)
  const [scheduleActionStatus, setScheduleActionStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  // Scheduled Calls
  const [scheduledCalls, setScheduledCalls] = useState<ScheduledCall[]>([])
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [callForm, setCallForm] = useState<CallFormData>({ prospect_email: '', prospect_name: '', company_name: '', preferred_date: '', preferred_time: '', duration: '30', agenda: '' })
  const [isSchedulingCall, setIsSchedulingCall] = useState(false)
  const [callStatus, setCallStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  // Settings
  const [settings, setSettings] = useState({ followUpDays: '3', maxFollowUps: '3', greetingStyle: 'professional', signature: 'Best regards,\nYour Name', dailyCap: '50' })

  // Agent tracking
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // Initialize timestamps safely
  const [currentTime, setCurrentTime] = useState('')
  useEffect(() => {
    setCurrentTime(new Date().toLocaleString())
  }, [])

  // Apply sample data
  useEffect(() => {
    if (showSampleData) {
      setGeneratedLeads(SAMPLE_LEADS)
      setFollowUpLeads(SAMPLE_FOLLOWUPS)
      setScheduledCalls(SAMPLE_CALLS)
      setMetrics({ totalLeads: 12, emailsSent: 8, replies: 3, callsBooked: 1 })
      setCampaigns([
        { id: 'c1', name: 'SaaS Video Outreach Q1', industry: 'SaaS', totalLeads: 5, emailsSent: 5, createdAt: '2025-01-14', status: 'active' },
        { id: 'c2', name: 'B2B Tech Content Campaign', industry: 'B2B Tech', totalLeads: 4, emailsSent: 3, createdAt: '2025-01-12', status: 'active' },
        { id: 'c3', name: 'Fintech Compliance Video', industry: 'Fintech', totalLeads: 3, emailsSent: 0, createdAt: '2025-01-16', status: 'draft' },
      ])
      setActivityLog([
        { id: 'a1', action: 'Campaign Generated', detail: 'SaaS Video Outreach Q1 - 5 leads found', timestamp: '2025-01-14 10:30 AM', agentName: 'Lead Campaign Coordinator' },
        { id: 'a2', action: 'Emails Sent', detail: '5 outreach emails delivered successfully', timestamp: '2025-01-14 11:15 AM', agentName: 'Email Delivery Agent' },
        { id: 'a3', action: 'Inbox Scanned', detail: '3 replies detected, 1 interested', timestamp: '2025-01-15 08:00 AM', agentName: 'Follow-Up Tracker' },
        { id: 'a4', action: 'Call Scheduled', detail: 'Discovery call with Sarah Chen at TechFlow', timestamp: '2025-01-15 09:30 AM', agentName: 'Call Scheduler' },
      ])
    } else {
      setGeneratedLeads([])
      setFollowUpLeads([])
      setScheduledCalls([])
      setMetrics({ totalLeads: 0, emailsSent: 0, replies: 0, callsBooked: 0 })
      setCampaigns([])
      setActivityLog([])
    }
  }, [showSampleData])

  // Load schedule on mount
  useEffect(() => {
    loadScheduleInfo()
  }, [])

  const loadScheduleInfo = useCallback(async () => {
    setIsLoadingSchedule(true)
    try {
      const schedResult = await getSchedule(SCHEDULE_ID)
      if (schedResult.success && schedResult.schedule) {
        setTrackerSchedule(schedResult.schedule)
      }
      const logsResult = await getScheduleLogs(SCHEDULE_ID, { limit: 5 })
      if (logsResult.success) {
        setScheduleLogs(Array.isArray(logsResult.executions) ? logsResult.executions : [])
      }
    } catch (e) { /* silent */ }
    setIsLoadingSchedule(false)
  }, [])

  const addActivity = useCallback((action: string, detail: string, agentName: string) => {
    const now = new Date()
    setActivityLog(prev => [{
      id: generateId(),
      action,
      detail,
      timestamp: now.toLocaleString(),
      agentName,
    }, ...prev])
  }, [])

  // =======================
  // Campaign Generation
  // =======================
  const handleGenerateCampaign = useCallback(async () => {
    if (selectedIndustries.length === 0) {
      setCampaignStatus({ type: 'error', message: 'Please select at least one industry.' })
      return
    }
    setIsGenerating(true)
    setCampaignStatus({ type: 'info', message: 'Generating campaign... This may take a moment.' })
    setActiveAgentId(AGENT_IDS.CAMPAIGN_COORDINATOR)
    setGeneratedLeads([])
    setSelectedLeadIndices(new Set())

    const message = `Find ${volume || '10'} B2B companies in ${selectedIndustries.join(', ')} with ${companySize || '100-500'} employees showing these signals: ${selectedSignals.length > 0 ? selectedSignals.join(', ') : 'any growth signals'}. Generate personalized video production outreach emails for each lead.`

    try {
      const result = await callAIAgent(message, AGENT_IDS.CAMPAIGN_COORDINATOR)
      if (result.success) {
        const rawResult = result?.response?.result
        const parsed = parseLLMJson(rawResult)
        const leads = Array.isArray(parsed?.leads_with_emails) ? parsed.leads_with_emails : []
        if (leads.length > 0) {
          setGeneratedLeads(leads)
          setMetrics(prev => ({ ...prev, totalLeads: prev.totalLeads + leads.length }))
          setCampaigns(prev => [...prev, {
            id: generateId(),
            name: `${selectedIndustries[0]} Outreach`,
            industry: selectedIndustries.join(', '),
            totalLeads: leads.length,
            emailsSent: 0,
            createdAt: new Date().toLocaleDateString(),
            status: 'draft',
          }])
          addActivity('Campaign Generated', `${leads.length} leads found in ${selectedIndustries.join(', ')}`, 'Lead Campaign Coordinator')
          setCampaignStatus({ type: 'success', message: `Campaign generated with ${leads.length} leads!` })
        } else {
          const summary = parsed?.campaign_summary ?? ''
          setCampaignStatus({ type: 'info', message: summary || 'Campaign generated but no leads returned. Try different criteria.' })
        }
      } else {
        setCampaignStatus({ type: 'error', message: result.error || 'Failed to generate campaign.' })
      }
    } catch (e) {
      setCampaignStatus({ type: 'error', message: 'Network error generating campaign.' })
    }
    setIsGenerating(false)
    setActiveAgentId(null)
  }, [selectedIndustries, companySize, selectedSignals, volume, addActivity])

  // =======================
  // Email Sending
  // =======================
  const handleSendEmails = useCallback(async () => {
    const indices = Array.from(selectedLeadIndices)
    if (indices.length === 0) {
      setCampaignStatus({ type: 'error', message: 'Please select at least one lead.' })
      return
    }
    setIsSending(true)
    setSendingProgress(0)
    setActiveAgentId(AGENT_IDS.EMAIL_DELIVERY)
    let sentCount = 0
    let failCount = 0

    for (let i = 0; i < indices.length; i++) {
      const lead = generatedLeads[indices[i]]
      if (!lead) continue
      const message = `Send email to ${lead.decision_maker_email}. Subject: ${lead.email_subject}. Body: ${lead.email_body}`
      try {
        const result = await callAIAgent(message, AGENT_IDS.EMAIL_DELIVERY)
        if (result.success) {
          sentCount++
        } else {
          failCount++
        }
      } catch {
        failCount++
      }
      setSendingProgress(Math.round(((i + 1) / indices.length) * 100))
    }

    setMetrics(prev => ({ ...prev, emailsSent: prev.emailsSent + sentCount }))
    addActivity('Emails Sent', `${sentCount} emails sent, ${failCount} failed`, 'Email Delivery Agent')
    setCampaignStatus({ type: sentCount > 0 ? 'success' : 'error', message: `${sentCount} emails sent successfully. ${failCount > 0 ? `${failCount} failed.` : ''}` })
    setSelectedLeadIndices(new Set())
    setIsSending(false)
    setActiveAgentId(null)
  }, [selectedLeadIndices, generatedLeads, addActivity])

  // =======================
  // Follow-Up Scanning
  // =======================
  const handleScanInbox = useCallback(async () => {
    setIsScanning(true)
    setFollowUpStatus({ type: 'info', message: 'Scanning inbox for replies...' })
    setActiveAgentId(AGENT_IDS.FOLLOW_UP_TRACKER)

    const message = 'Scan Gmail inbox for prospect replies from outreach emails sent in the past 7 days. Categorize each response as interested, not_interested, needs_followup, or auto_reply. Draft personalized follow-up emails for leads that need follow-up.'

    try {
      const result = await callAIAgent(message, AGENT_IDS.FOLLOW_UP_TRACKER)
      if (result.success) {
        const rawResult = result?.response?.result
        const parsed = parseLLMJson(rawResult)
        const leads = Array.isArray(parsed?.categorized_leads) ? parsed.categorized_leads : []
        if (leads.length > 0) {
          setFollowUpLeads(leads)
          const interested = leads.filter((l: FollowUpLead) => l.category === 'interested').length
          setMetrics(prev => ({ ...prev, replies: prev.replies + interested }))
          addActivity('Inbox Scanned', `${leads.length} leads scanned, ${interested} interested`, 'Follow-Up Tracker')
          setFollowUpStatus({ type: 'success', message: `Scan complete: ${leads.length} leads categorized.` })
        } else {
          const summary = parsed?.scan_summary ?? ''
          setFollowUpStatus({ type: 'info', message: summary || 'Scan complete but no categorized leads found.' })
        }
      } else {
        setFollowUpStatus({ type: 'error', message: result.error || 'Failed to scan inbox.' })
      }
    } catch {
      setFollowUpStatus({ type: 'error', message: 'Network error scanning inbox.' })
    }
    setIsScanning(false)
    setActiveAgentId(null)
  }, [addActivity])

  // =======================
  // Send Follow-Ups
  // =======================
  const handleSendFollowUps = useCallback(async () => {
    const indices = Array.from(selectedFollowUps)
    const needsFollowUp = followUpLeads.filter(l => l.category === 'needs_followup')
    if (indices.length === 0) {
      setFollowUpStatus({ type: 'error', message: 'Please select leads to follow up.' })
      return
    }
    setIsSendingFollowUps(true)
    setActiveAgentId(AGENT_IDS.EMAIL_DELIVERY)
    let sentCount = 0

    for (const idx of indices) {
      const lead = needsFollowUp[idx]
      if (!lead) continue
      const message = `Send email to ${lead.prospect_email}. Subject: ${lead.followup_draft_subject}. Body: ${lead.followup_draft_body}`
      try {
        const result = await callAIAgent(message, AGENT_IDS.EMAIL_DELIVERY)
        if (result.success) sentCount++
      } catch { /* continue */ }
    }

    setMetrics(prev => ({ ...prev, emailsSent: prev.emailsSent + sentCount }))
    addActivity('Follow-Ups Sent', `${sentCount} follow-up emails sent`, 'Email Delivery Agent')
    setFollowUpStatus({ type: 'success', message: `${sentCount} follow-up emails sent.` })
    setSelectedFollowUps(new Set())
    setIsSendingFollowUps(false)
    setActiveAgentId(null)
  }, [selectedFollowUps, followUpLeads, addActivity])

  // =======================
  // Schedule Actions
  // =======================
  const handleToggleSchedule = useCallback(async () => {
    if (!trackerSchedule) return
    setScheduleActionStatus({ type: 'info', message: trackerSchedule.is_active ? 'Pausing schedule...' : 'Resuming schedule...' })
    try {
      if (trackerSchedule.is_active) {
        await pauseSchedule(SCHEDULE_ID)
      } else {
        await resumeSchedule(SCHEDULE_ID)
      }
      const refreshed = await listSchedules()
      if (refreshed.success) {
        const found = refreshed.schedules.find(s => s.id === SCHEDULE_ID)
        if (found) setTrackerSchedule(found)
      }
      setScheduleActionStatus({ type: 'success', message: trackerSchedule.is_active ? 'Schedule paused.' : 'Schedule resumed.' })
    } catch {
      setScheduleActionStatus({ type: 'error', message: 'Failed to toggle schedule.' })
    }
  }, [trackerSchedule])

  const handleTriggerNow = useCallback(async () => {
    setScheduleActionStatus({ type: 'info', message: 'Triggering scan now...' })
    try {
      const result = await triggerScheduleNow(SCHEDULE_ID)
      if (result.success) {
        setScheduleActionStatus({ type: 'success', message: 'Scan triggered! Results will appear shortly.' })
        addActivity('Manual Scan Triggered', 'Follow-Up Tracker triggered manually', 'Follow-Up Tracker')
      } else {
        setScheduleActionStatus({ type: 'error', message: result.error || 'Failed to trigger scan.' })
      }
    } catch {
      setScheduleActionStatus({ type: 'error', message: 'Network error triggering scan.' })
    }
  }, [addActivity])

  // =======================
  // Schedule Call
  // =======================
  const handleScheduleCall = useCallback(async () => {
    if (!callForm.prospect_email || !callForm.prospect_name || !callForm.preferred_date || !callForm.preferred_time) {
      setCallStatus({ type: 'error', message: 'Please fill in all required fields.' })
      return
    }
    setIsSchedulingCall(true)
    setActiveAgentId(AGENT_IDS.CALL_SCHEDULER)
    setCallStatus({ type: 'info', message: 'Scheduling call...' })

    const message = `Schedule a discovery call with ${callForm.prospect_name} (${callForm.prospect_email}) from ${callForm.company_name}. Preferred date: ${callForm.preferred_date}, preferred time: ${callForm.preferred_time}, duration: ${callForm.duration} minutes. Agenda: ${callForm.agenda || 'General discovery call'}`

    try {
      const result = await callAIAgent(message, AGENT_IDS.CALL_SCHEDULER)
      if (result.success) {
        const rawResult = result?.response?.result
        const parsed = parseLLMJson(rawResult)
        const eventDetails = parsed?.event_details
        if (eventDetails) {
          setScheduledCalls(prev => [...prev, {
            event_title: eventDetails?.event_title ?? `Call with ${callForm.prospect_name}`,
            prospect_name: eventDetails?.prospect_name ?? callForm.prospect_name,
            prospect_email: eventDetails?.prospect_email ?? callForm.prospect_email,
            company_name: eventDetails?.company_name ?? callForm.company_name,
            scheduled_date: eventDetails?.scheduled_date ?? callForm.preferred_date,
            scheduled_time: eventDetails?.scheduled_time ?? callForm.preferred_time,
            duration_minutes: eventDetails?.duration_minutes ?? parseInt(callForm.duration),
            meeting_link: eventDetails?.meeting_link ?? '',
            calendar_name: eventDetails?.calendar_name ?? 'Work Calendar',
            agenda: eventDetails?.agenda ?? callForm.agenda,
          }])
          setMetrics(prev => ({ ...prev, callsBooked: prev.callsBooked + 1 }))
          addActivity('Call Scheduled', `Discovery call with ${callForm.prospect_name} at ${callForm.company_name}`, 'Call Scheduler')
          setCallStatus({ type: 'success', message: 'Call scheduled successfully!' })
          setShowScheduleModal(false)
          setCallForm({ prospect_email: '', prospect_name: '', company_name: '', preferred_date: '', preferred_time: '', duration: '30', agenda: '' })
        } else {
          setCallStatus({ type: 'info', message: parsed?.scheduling_status ?? 'Call scheduling attempted.' })
        }
      } else {
        setCallStatus({ type: 'error', message: result.error || 'Failed to schedule call.' })
      }
    } catch {
      setCallStatus({ type: 'error', message: 'Network error scheduling call.' })
    }
    setIsSchedulingCall(false)
    setActiveAgentId(null)
  }, [callForm, addActivity])

  const openScheduleCallForLead = useCallback((lead: LeadEmail | FollowUpLead) => {
    const isFollowUp = 'prospect_email' in lead
    setCallForm({
      prospect_email: isFollowUp ? (lead as FollowUpLead).prospect_email : (lead as LeadEmail).decision_maker_email,
      prospect_name: isFollowUp ? (lead as FollowUpLead).prospect_name : (lead as LeadEmail).decision_maker_name,
      company_name: lead.company_name,
      preferred_date: '',
      preferred_time: '',
      duration: '30',
      agenda: '',
    })
    setShowScheduleModal(true)
    setActiveTab('calls')
  }, [])

  // Sidebar nav items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <HiOutlineHome className="h-5 w-5" /> },
    { id: 'campaigns', label: 'Campaigns', icon: <HiOutlineRocketLaunch className="h-5 w-5" /> },
    { id: 'followups', label: 'Follow-Ups', icon: <HiOutlineEnvelopeOpen className="h-5 w-5" /> },
    { id: 'calls', label: 'Calls', icon: <HiOutlineCalendarDays className="h-5 w-5" /> },
    { id: 'settings', label: 'Settings', icon: <HiOutlineCog6Tooth className="h-5 w-5" /> },
  ]

  // Follow-up columns
  const interestedLeads = followUpLeads.filter(l => l.category === 'interested')
  const needsFollowUpLeads = followUpLeads.filter(l => l.category === 'needs_followup')
  const noResponseLeads = followUpLeads.filter(l => l.category === 'not_interested' || l.category === 'auto_reply' || !l.reply_snippet)

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground flex">
        {/* ======================== SIDEBAR ======================== */}
        <aside className={cn('h-screen sticky top-0 flex flex-col border-r border-border/50 glass-panel transition-all duration-300 z-30', sidebarCollapsed ? 'w-16' : 'w-60')}>
          <div className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
              <FiTarget className="h-5 w-5 text-primary-foreground" />
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden">
                <h1 className="font-serif font-bold text-lg tracking-tight leading-none">LeadFlow</h1>
                <p className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase">AI</p>
              </div>
            )}
          </div>
          <Separator className="mx-3" />
          <nav className="flex-1 p-2 space-y-1 mt-2">
            {navItems.map((item) => (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200', activeTab === item.id ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
                {item.icon}
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            ))}
          </nav>
          <div className="p-2">
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="w-full flex items-center justify-center p-2 rounded-xl text-muted-foreground hover:bg-muted transition-colors">
              {sidebarCollapsed ? <FiChevronRight className="h-4 w-4" /> : <FiChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        </aside>

        {/* ======================== MAIN ======================== */}
        <main className="flex-1 overflow-y-auto">
          {/* Top Bar */}
          <div className="sticky top-0 z-20 glass-panel border-b border-border/50 px-6 py-3 flex items-center justify-between">
            <div>
              <h2 className="font-serif font-bold text-xl tracking-tight">{navItems.find(n => n.id === activeTab)?.label ?? 'Dashboard'}</h2>
              {currentTime && <p className="text-xs text-muted-foreground">{currentTime}</p>}
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground cursor-pointer">Sample Data</Label>
              <Switch id="sample-toggle" checked={showSampleData} onCheckedChange={setShowSampleData} />
            </div>
          </div>

          <div className="p-6">
            {/* ==================== DASHBOARD ==================== */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard title="Total Leads" value={metrics.totalLeads} icon={<FiUsers className="h-6 w-6" />} />
                  <MetricCard title="Emails Sent" value={metrics.emailsSent} icon={<FiMail className="h-6 w-6" />} />
                  <MetricCard title="Replies" value={metrics.replies} icon={<FiActivity className="h-6 w-6" />} />
                  <MetricCard title="Calls Booked" value={metrics.callsBooked} icon={<FiPhone className="h-6 w-6" />} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Active Campaigns */}
                  <Card className="glass-panel border-border/50 shadow-md">
                    <CardHeader>
                      <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2"><HiOutlineRocketLaunch className="h-5 w-5 text-primary" />Active Campaigns</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {campaigns.length === 0 ? (
                        <div className="text-center py-8">
                          <FiTarget className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No campaigns yet.</p>
                          <Button variant="default" size="sm" className="mt-3" onClick={() => setActiveTab('campaigns')}>
                            <FiPlus className="h-4 w-4 mr-1" />Create Campaign
                          </Button>
                        </div>
                      ) : (
                        <ScrollArea className="h-[240px]">
                          <div className="space-y-3">
                            {campaigns.map((c) => (
                              <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                                <div>
                                  <p className="text-sm font-medium">{c.name}</p>
                                  <p className="text-xs text-muted-foreground">{c.industry} -- {c.createdAt}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={c.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">{c.status}</Badge>
                                  <span className="text-xs font-mono text-muted-foreground">{c.totalLeads} leads</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>

                  {/* Activity Feed */}
                  <Card className="glass-panel border-border/50 shadow-md">
                    <CardHeader>
                      <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2"><FiActivity className="h-5 w-5 text-primary" />Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {activityLog.length === 0 ? (
                        <div className="text-center py-8">
                          <FiClock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No activity yet. Start by creating a campaign.</p>
                        </div>
                      ) : (
                        <ScrollArea className="h-[240px]">
                          <div className="space-y-3">
                            {activityLog.map((a) => (
                              <div key={a.id} className="flex gap-3 p-2">
                                <div className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-medium">{a.action}</p>
                                  <p className="text-xs text-muted-foreground">{a.detail}</p>
                                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">{a.agentName} -- {a.timestamp}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <AgentStatusSection activeAgentId={activeAgentId} />

                {/* Quick Action */}
                <div className="flex justify-center">
                  <Button size="lg" className="shadow-lg shadow-primary/20" onClick={() => setActiveTab('campaigns')}>
                    <FiPlus className="h-5 w-5 mr-2" />New Campaign
                  </Button>
                </div>
              </div>
            )}

            {/* ==================== CAMPAIGNS ==================== */}
            {activeTab === 'campaigns' && (
              <div className="space-y-6">
                {campaignStatus && <StatusBanner type={campaignStatus.type} message={campaignStatus.message} onDismiss={() => setCampaignStatus(null)} />}

                {/* Targeting Form */}
                <Card className="glass-panel border-border/50 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold tracking-tight">Campaign Targeting</CardTitle>
                    <CardDescription>Define your ideal customer profile to generate targeted leads.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Industries */}
                    <div>
                      <Label className="text-sm font-medium">Industries</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {INDUSTRIES.map((ind) => {
                          const isSelected = selectedIndustries.includes(ind)
                          return (
                            <button key={ind} onClick={() => setSelectedIndustries(prev => isSelected ? prev.filter(i => i !== ind) : [...prev, ind])} className={cn('px-3 py-1.5 rounded-xl text-sm font-medium border transition-all duration-200', isSelected ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-background border-border text-muted-foreground hover:border-primary/50')}>
                              {ind}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Company Size */}
                    <div>
                      <Label className="text-sm font-medium">Company Size (employees)</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {COMPANY_SIZES.map((size) => (
                          <button key={size} onClick={() => setCompanySize(companySize === size ? '' : size)} className={cn('px-3 py-1.5 rounded-xl text-sm font-medium border transition-all duration-200', companySize === size ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-background border-border text-muted-foreground hover:border-primary/50')}>
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Signals */}
                    <div>
                      <Label className="text-sm font-medium">Growth Signals</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {SIGNALS.map((sig) => {
                          const isSelected = selectedSignals.includes(sig)
                          return (
                            <button key={sig} onClick={() => setSelectedSignals(prev => isSelected ? prev.filter(s => s !== sig) : [...prev, sig])} className={cn('px-3 py-1.5 rounded-xl text-sm font-medium border transition-all duration-200', isSelected ? 'border-transparent shadow-sm ' + getSignalColor(sig) : 'bg-background border-border text-muted-foreground hover:border-primary/50')}>
                              {sig}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Volume */}
                    <div className="max-w-xs">
                      <Label className="text-sm font-medium">Number of Leads</Label>
                      <Input type="number" min={1} max={50} value={volume} onChange={(e) => setVolume(e.target.value)} className="mt-1 font-mono" placeholder="10" />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button onClick={handleGenerateCampaign} disabled={isGenerating || selectedIndustries.length === 0} className="shadow-md shadow-primary/20">
                      {isGenerating ? <><FiLoader className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><HiOutlineRocketLaunch className="h-4 w-4 mr-2" />Generate Campaign</>}
                    </Button>
                  </CardFooter>
                </Card>

                {/* Loading State */}
                {isGenerating && <LoadingOverlay message="AI is finding and qualifying leads..." />}

                {/* Lead Results */}
                {generatedLeads.length > 0 && !isGenerating && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg tracking-tight">Generated Leads ({generatedLeads.length})</h3>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          if (selectedLeadIndices.size === generatedLeads.length) {
                            setSelectedLeadIndices(new Set())
                          } else {
                            setSelectedLeadIndices(new Set(generatedLeads.map((_, i) => i)))
                          }
                        }}>
                          {selectedLeadIndices.size === generatedLeads.length ? 'Deselect All' : 'Select All'}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {generatedLeads.map((lead, idx) => (
                        <LeadCard
                          key={idx}
                          lead={lead}
                          index={idx}
                          selected={selectedLeadIndices.has(idx)}
                          onToggle={() => setSelectedLeadIndices(prev => {
                            const next = new Set(prev)
                            if (next.has(idx)) next.delete(idx)
                            else next.add(idx)
                            return next
                          })}
                          onEdit={(field, value) => {
                            setGeneratedLeads(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l))
                          }}
                          expanded={expandedLeadIndices.has(idx)}
                          onExpand={() => setExpandedLeadIndices(prev => {
                            const next = new Set(prev)
                            if (next.has(idx)) next.delete(idx)
                            else next.add(idx)
                            return next
                          })}
                        />
                      ))}
                    </div>

                    {/* Action Bar */}
                    <Card className="glass-panel border-primary/30 shadow-lg sticky bottom-4">
                      <CardContent className="p-4 flex items-center justify-between">
                        <p className="text-sm font-medium">{selectedLeadIndices.size} lead{selectedLeadIndices.size !== 1 ? 's' : ''} selected</p>
                        <div className="flex items-center gap-3">
                          {isSending && (
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <Progress value={sendingProgress} className="h-2 flex-1" />
                              <span className="text-xs font-mono">{sendingProgress}%</span>
                            </div>
                          )}
                          <Button onClick={handleSendEmails} disabled={isSending || selectedLeadIndices.size === 0} className="shadow-md">
                            {isSending ? <><FiLoader className="h-4 w-4 mr-2 animate-spin" />Sending...</> : <><FiSend className="h-4 w-4 mr-2" />Approve & Send ({selectedLeadIndices.size})</>}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Empty state */}
                {generatedLeads.length === 0 && !isGenerating && (
                  <div className="text-center py-12">
                    <FiTarget className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">Configure your targeting criteria above and generate a campaign to see leads here.</p>
                  </div>
                )}
              </div>
            )}

            {/* ==================== FOLLOW-UPS ==================== */}
            {activeTab === 'followups' && (
              <div className="space-y-6">
                {followUpStatus && <StatusBanner type={followUpStatus.type} message={followUpStatus.message} onDismiss={() => setFollowUpStatus(null)} />}

                {/* Schedule Management */}
                <Card className="glass-panel border-border/50 shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2"><FiClock className="h-5 w-5 text-primary" />Automated Follow-Up Schedule</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingSchedule ? (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className={cn('h-2.5 w-2.5 rounded-full', trackerSchedule?.is_active ? 'bg-green-500' : 'bg-muted-foreground/40')} />
                          <span className="text-sm font-medium">{trackerSchedule?.is_active ? 'Active' : 'Paused'}</span>
                        </div>
                        <Separator orientation="vertical" className="h-5" />
                        <span className="text-sm text-muted-foreground">{trackerSchedule?.cron_expression ? cronToHuman(trackerSchedule.cron_expression) : 'Daily at 8:00 AM'}</span>
                        {trackerSchedule?.next_run_time && (
                          <>
                            <Separator orientation="vertical" className="h-5" />
                            <span className="text-xs text-muted-foreground">Next: {new Date(trackerSchedule.next_run_time).toLocaleString()}</span>
                          </>
                        )}
                        <div className="flex gap-2 ml-auto">
                          <Button variant="outline" size="sm" onClick={handleToggleSchedule}>
                            {trackerSchedule?.is_active ? <><FiPause className="h-3.5 w-3.5 mr-1" />Pause</> : <><FiPlay className="h-3.5 w-3.5 mr-1" />Resume</>}
                          </Button>
                          <Button variant="outline" size="sm" onClick={handleTriggerNow}>
                            <FiZap className="h-3.5 w-3.5 mr-1" />Trigger Now
                          </Button>
                          <Button variant="outline" size="sm" onClick={loadScheduleInfo}>
                            <FiRefreshCw className="h-3.5 w-3.5 mr-1" />Refresh
                          </Button>
                        </div>
                      </div>
                    )}
                    {scheduleActionStatus && <div className="mt-3"><StatusBanner type={scheduleActionStatus.type} message={scheduleActionStatus.message} onDismiss={() => setScheduleActionStatus(null)} /></div>}

                    {/* Execution Logs */}
                    {scheduleLogs.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Recent Executions</p>
                        <div className="space-y-1">
                          {scheduleLogs.slice(0, 3).map((log) => (
                            <div key={log.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted/30">
                              {log.success ? <FiCheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" /> : <FiXCircle className="h-3 w-3 text-red-500 flex-shrink-0" />}
                              <span className="text-muted-foreground">{new Date(log.executed_at).toLocaleString()}</span>
                              <span className={cn('ml-auto font-mono', log.success ? 'text-green-600' : 'text-red-500')}>{log.success ? 'OK' : 'FAIL'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Scan button */}
                <div className="flex items-center gap-3">
                  <Button onClick={handleScanInbox} disabled={isScanning}>
                    {isScanning ? <><FiLoader className="h-4 w-4 mr-2 animate-spin" />Scanning...</> : <><FiSearch className="h-4 w-4 mr-2" />Scan Now</>}
                  </Button>
                  {needsFollowUpLeads.length > 0 && selectedFollowUps.size > 0 && (
                    <Button onClick={handleSendFollowUps} disabled={isSendingFollowUps} variant="default">
                      {isSendingFollowUps ? <><FiLoader className="h-4 w-4 mr-2 animate-spin" />Sending...</> : <><FiSend className="h-4 w-4 mr-2" />Send Follow-Ups ({selectedFollowUps.size})</>}
                    </Button>
                  )}
                </div>

                {isScanning && <LoadingOverlay message="Scanning inbox for prospect replies..." />}

                {/* Kanban Board */}
                {followUpLeads.length > 0 && !isScanning && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Interested Column */}
                    <div>
                      <div className="flex items-center gap-2 mb-3 p-3 rounded-xl bg-green-50 border border-green-200">
                        <div className="h-3 w-3 rounded-full bg-green-500" />
                        <span className="text-sm font-semibold text-green-800">Interested</span>
                        <Badge variant="secondary" className="ml-auto text-[10px]">{interestedLeads.length}</Badge>
                      </div>
                      <ScrollArea className="h-[500px]">
                        {interestedLeads.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-6">No interested leads yet.</p>
                        ) : (
                          interestedLeads.map((lead, idx) => (
                            <FollowUpCard key={idx} lead={lead} selected={false} onToggle={() => {}} onEditDraft={(f, v) => {
                              setFollowUpLeads(prev => prev.map(l => l.prospect_email === lead.prospect_email ? { ...l, [f]: v } : l))
                            }} />
                          ))
                        )}
                      </ScrollArea>
                    </div>

                    {/* Needs Follow-Up Column */}
                    <div>
                      <div className="flex items-center gap-2 mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                        <div className="h-3 w-3 rounded-full bg-amber-500" />
                        <span className="text-sm font-semibold text-amber-800">Needs Follow-Up</span>
                        <Badge variant="secondary" className="ml-auto text-[10px]">{needsFollowUpLeads.length}</Badge>
                      </div>
                      <ScrollArea className="h-[500px]">
                        {needsFollowUpLeads.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-6">No leads need follow-up.</p>
                        ) : (
                          needsFollowUpLeads.map((lead, idx) => (
                            <FollowUpCard key={idx} lead={lead} selected={selectedFollowUps.has(idx)} onToggle={() => {
                              setSelectedFollowUps(prev => {
                                const next = new Set(prev)
                                if (next.has(idx)) next.delete(idx)
                                else next.add(idx)
                                return next
                              })
                            }} onEditDraft={(f, v) => {
                              setFollowUpLeads(prev => prev.map(l => l.prospect_email === lead.prospect_email ? { ...l, [f]: v } : l))
                            }} />
                          ))
                        )}
                      </ScrollArea>
                    </div>

                    {/* No Response Column */}
                    <div>
                      <div className="flex items-center gap-2 mb-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="h-3 w-3 rounded-full bg-slate-400" />
                        <span className="text-sm font-semibold text-slate-700">No Response</span>
                        <Badge variant="secondary" className="ml-auto text-[10px]">{noResponseLeads.length}</Badge>
                      </div>
                      <ScrollArea className="h-[500px]">
                        {noResponseLeads.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-6">No unresponsive leads.</p>
                        ) : (
                          noResponseLeads.map((lead, idx) => (
                            <FollowUpCard key={idx} lead={lead} selected={false} onToggle={() => {}} onEditDraft={(f, v) => {
                              setFollowUpLeads(prev => prev.map(l => l.prospect_email === lead.prospect_email ? { ...l, [f]: v } : l))
                            }} />
                          ))
                        )}
                      </ScrollArea>
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {followUpLeads.length === 0 && !isScanning && (
                  <div className="text-center py-12">
                    <HiOutlineEnvelopeOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No follow-up data yet. Click "Scan Now" to check your inbox for replies, or the automated schedule will scan daily at 8:00 AM.</p>
                  </div>
                )}
              </div>
            )}

            {/* ==================== CALLS ==================== */}
            {activeTab === 'calls' && (
              <div className="space-y-6">
                {callStatus && <StatusBanner type={callStatus.type} message={callStatus.message} onDismiss={() => setCallStatus(null)} />}

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold tracking-tight">Scheduled Calls</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Book and manage discovery calls with prospects.</p>
                  </div>
                  <Button onClick={() => setShowScheduleModal(true)}>
                    <FiPlus className="h-4 w-4 mr-2" />Schedule Call
                  </Button>
                </div>

                {/* Scheduled Calls List */}
                {scheduledCalls.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {scheduledCalls.map((call, idx) => (
                      <Card key={idx} className="glass-panel border-border/50 shadow-sm hover:shadow-md transition-all duration-300">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-semibold text-sm tracking-tight">{call.event_title || `Call with ${call.prospect_name}`}</h4>
                              <p className="text-xs text-muted-foreground mt-0.5">{call.prospect_name} -- {call.company_name}</p>
                            </div>
                            <Badge className="text-[10px] bg-blue-100 text-blue-700 border-blue-200">Scheduled</Badge>
                          </div>
                          <div className="mt-3 space-y-1.5">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <FiCalendar className="h-3.5 w-3.5" />
                              <span>{call.scheduled_date} at {call.scheduled_time}</span>
                              <span className="font-mono">({call.duration_minutes}min)</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <FiMail className="h-3.5 w-3.5" />
                              <span>{call.prospect_email}</span>
                            </div>
                            {call.meeting_link && (
                              <div className="flex items-center gap-2 text-xs">
                                <FiLink className="h-3.5 w-3.5 text-primary" />
                                <a href={call.meeting_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{call.meeting_link}</a>
                              </div>
                            )}
                            {call.agenda && (
                              <div className="mt-2 p-2 bg-muted/40 rounded-lg">
                                <p className="text-xs text-muted-foreground font-medium mb-0.5">Agenda</p>
                                <p className="text-xs">{call.agenda}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <HiOutlineCalendarDays className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No calls scheduled yet. Click "Schedule Call" to book a discovery call.</p>
                  </div>
                )}

                {/* Schedule Call Dialog */}
                <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Schedule Discovery Call</DialogTitle>
                      <DialogDescription>Fill in the details to schedule a call with a prospect.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm">Prospect Name *</Label>
                          <Input value={callForm.prospect_name} onChange={(e) => setCallForm(prev => ({ ...prev, prospect_name: e.target.value }))} placeholder="Sarah Chen" className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-sm">Company *</Label>
                          <Input value={callForm.company_name} onChange={(e) => setCallForm(prev => ({ ...prev, company_name: e.target.value }))} placeholder="TechFlow Solutions" className="mt-1" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm">Prospect Email *</Label>
                        <Input type="email" value={callForm.prospect_email} onChange={(e) => setCallForm(prev => ({ ...prev, prospect_email: e.target.value }))} placeholder="sarah@techflow.io" className="mt-1" />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-sm">Date *</Label>
                          <Input type="date" value={callForm.preferred_date} onChange={(e) => setCallForm(prev => ({ ...prev, preferred_date: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-sm">Time *</Label>
                          <Input type="time" value={callForm.preferred_time} onChange={(e) => setCallForm(prev => ({ ...prev, preferred_time: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-sm">Duration</Label>
                          <Select value={callForm.duration} onValueChange={(val) => setCallForm(prev => ({ ...prev, duration: val }))}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="15">15 min</SelectItem>
                              <SelectItem value="30">30 min</SelectItem>
                              <SelectItem value="45">45 min</SelectItem>
                              <SelectItem value="60">60 min</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm">Agenda</Label>
                        <Textarea value={callForm.agenda} onChange={(e) => setCallForm(prev => ({ ...prev, agenda: e.target.value }))} placeholder="Discuss video production needs, share portfolio..." rows={3} className="mt-1" />
                      </div>
                    </div>
                    <DialogFooter className="mt-4">
                      <Button variant="outline" onClick={() => setShowScheduleModal(false)}>Cancel</Button>
                      <Button onClick={handleScheduleCall} disabled={isSchedulingCall || !callForm.prospect_email || !callForm.prospect_name || !callForm.preferred_date || !callForm.preferred_time}>
                        {isSchedulingCall ? <><FiLoader className="h-4 w-4 mr-2 animate-spin" />Scheduling...</> : <><FiCalendar className="h-4 w-4 mr-2" />Schedule Call</>}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {/* ==================== SETTINGS ==================== */}
            {activeTab === 'settings' && (
              <div className="space-y-6 max-w-2xl">
                {/* Connections */}
                <Card className="glass-panel border-border/50 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold tracking-tight">Integrations</CardTitle>
                    <CardDescription>Connected services for email and calendar operations.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-red-100 flex items-center justify-center"><FiMail className="h-4 w-4 text-red-600" /></div>
                        <div>
                          <p className="text-sm font-medium">Gmail</p>
                          <p className="text-xs text-muted-foreground">Send outreach emails and scan for replies</p>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">Connected</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center"><FiCalendar className="h-4 w-4 text-blue-600" /></div>
                        <div>
                          <p className="text-sm font-medium">Google Calendar</p>
                          <p className="text-xs text-muted-foreground">Schedule discovery calls with prospects</p>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">Connected</Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Follow-up Rules */}
                <Card className="glass-panel border-border/50 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold tracking-tight">Follow-Up Rules</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">Days Before Follow-Up</Label>
                        <Input type="number" min={1} max={14} value={settings.followUpDays} onChange={(e) => setSettings(prev => ({ ...prev, followUpDays: e.target.value }))} className="mt-1 font-mono" />
                      </div>
                      <div>
                        <Label className="text-sm">Max Follow-Ups Per Lead</Label>
                        <Input type="number" min={1} max={10} value={settings.maxFollowUps} onChange={(e) => setSettings(prev => ({ ...prev, maxFollowUps: e.target.value }))} className="mt-1 font-mono" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Email Defaults */}
                <Card className="glass-panel border-border/50 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold tracking-tight">Email Defaults</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm">Greeting Style</Label>
                      <Select value={settings.greetingStyle} onValueChange={(val) => setSettings(prev => ({ ...prev, greetingStyle: val }))}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional (Dear/Hello)</SelectItem>
                          <SelectItem value="casual">Casual (Hi/Hey)</SelectItem>
                          <SelectItem value="formal">Formal (Dear Mr./Ms.)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm">Email Signature</Label>
                      <Textarea value={settings.signature} onChange={(e) => setSettings(prev => ({ ...prev, signature: e.target.value }))} rows={3} className="mt-1 font-mono text-sm" />
                    </div>
                    <div className="max-w-xs">
                      <Label className="text-sm">Daily Outreach Volume Cap</Label>
                      <Input type="number" min={1} max={200} value={settings.dailyCap} onChange={(e) => setSettings(prev => ({ ...prev, dailyCap: e.target.value }))} className="mt-1 font-mono" />
                    </div>
                  </CardContent>
                </Card>

                {/* Schedule Info */}
                <Card className="glass-panel border-border/50 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2"><FiClock className="h-5 w-5 text-primary" />Follow-Up Tracker Schedule</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingSchedule ? (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    ) : trackerSchedule ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Status</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <div className={cn('h-2 w-2 rounded-full', trackerSchedule.is_active ? 'bg-green-500' : 'bg-muted-foreground/40')} />
                              <span className="text-sm font-medium">{trackerSchedule.is_active ? 'Active' : 'Paused'}</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Schedule</p>
                            <p className="text-sm font-medium mt-0.5">{trackerSchedule.cron_expression ? cronToHuman(trackerSchedule.cron_expression) : 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Timezone</p>
                            <p className="text-sm font-medium mt-0.5">{trackerSchedule.timezone || 'UTC'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Next Run</p>
                            <p className="text-sm font-medium mt-0.5">{trackerSchedule.next_run_time ? new Date(trackerSchedule.next_run_time).toLocaleString() : 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Button variant="outline" size="sm" onClick={handleToggleSchedule}>
                            {trackerSchedule.is_active ? <><FiPause className="h-3.5 w-3.5 mr-1" />Pause</> : <><FiPlay className="h-3.5 w-3.5 mr-1" />Resume</>}
                          </Button>
                          <Button variant="outline" size="sm" onClick={handleTriggerNow}>
                            <FiZap className="h-3.5 w-3.5 mr-1" />Trigger Now
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Schedule information unavailable.</p>
                    )}
                  </CardContent>
                </Card>

                <AgentStatusSection activeAgentId={activeAgentId} />
              </div>
            )}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}
