import { useState, useEffect } from 'react'

function ProgressBar({ value, max, color }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div style={{ background: 'var(--border)', borderRadius: 4, height: 8, overflow: 'hidden', width: '100%' }}>
      <div style={{ background: color || 'var(--blue)', borderRadius: 4, height: '100%', width: `${pct}%`, transition: 'width 0.4s' }} />
    </div>
  )
}

function GradeCard({ grade, responseRate }) {
  const gradeColor = grade === 'A' ? 'var(--green)' : grade === 'B' ? 'var(--yellow)' : 'var(--red)'
  const benchmark = 12
  const aboveBenchmark = responseRate >= benchmark

  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 32, padding: 28, marginBottom: 20 }}>
      <div style={{
        alignItems: 'center',
        background: gradeColor + '22',
        border: `2px solid ${gradeColor}`,
        borderRadius: 'var(--radius-lg)',
        color: gradeColor,
        display: 'flex',
        flexShrink: 0,
        fontSize: 56,
        fontWeight: 800,
        height: 96,
        justifyContent: 'center',
        width: 96,
      }}>
        {grade}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overall Grade</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Job Search Strategy</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: aboveBenchmark ? 'var(--green)' : 'var(--red)' }}>
            {typeof responseRate === 'number' ? `${responseRate}%` : responseRate}
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Response Rate</div>
            <div style={{ fontSize: 11, color: aboveBenchmark ? 'var(--green)' : 'var(--red)' }}>
              {aboveBenchmark ? `↑ above 12% benchmark` : `↓ below 12% benchmark`}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FindingCard({ finding }) {
  const color = finding.severity === 'critical' ? 'var(--red)' : finding.severity === 'warning' ? 'var(--yellow)' : 'var(--blue)'
  const emoji = finding.severity === 'critical' ? '🔴' : finding.severity === 'warning' ? '🟡' : '🔵'

  return (
    <div style={{
      background: 'var(--card)',
      border: `1px solid ${color}44`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 'var(--radius-sm)',
      padding: '12px 16px',
      marginBottom: 10,
    }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{emoji} {finding.finding}</div>
      <div style={{ color: 'var(--text-3)', fontSize: 12 }}>Evidence: {finding.evidence}</div>
    </div>
  )
}

function IssueCard({ issue, index }) {
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      marginBottom: 12,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <span style={{ color: 'var(--text-3)', fontWeight: 700, marginRight: 10, fontSize: 13 }}>{index + 1}.</span>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{issue.issue}</span>
      </div>
      <div style={{ padding: '12px 16px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Impact</div>
          <div style={{ fontSize: 13, color: 'var(--red)', lineHeight: 1.5 }}>{issue.impact}</div>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Fix</div>
          <div style={{ fontSize: 13, color: 'var(--green)', lineHeight: 1.5 }}>{issue.fix}</div>
        </div>
      </div>
    </div>
  )
}

function RecommendationCol({ title, items, color }) {
  return (
    <div style={{ flex: 1, minWidth: 180 }}>
      <div style={{
        fontSize: 12,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        color,
        marginBottom: 12,
        paddingBottom: 8,
        borderBottom: `2px solid ${color}44`,
      }}>
        {title}
      </div>
      {(items || []).map((item, i) => (
        <div key={i} style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 13,
          lineHeight: 1.5,
          marginBottom: 8,
          padding: '10px 12px',
          color: 'var(--text-2)',
        }}>
          {item}
        </div>
      ))}
    </div>
  )
}

export default function Insights() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/analyze-patterns')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <span className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  )

  if (error) return (
    <div style={{ padding: 32 }}>
      <div className="card" style={{ color: 'var(--red)', padding: 20 }}>Error: {error}</div>
    </div>
  )

  if (!data) return null

  if (data.insufficientData) {
    const current = data.currentCount || 0
    return (
      <div style={{ padding: 32, maxWidth: 520 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Insights</h1>
        <p style={{ color: 'var(--text-3)', fontSize: 14, marginBottom: 28 }}>Pattern analysis unlocks after 5 applications</p>
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            Apply to {5 - current} more job{5 - current !== 1 ? 's' : ''} to unlock pattern analysis
          </h2>
          <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            {data.message}
          </p>
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>
              <span>{current} applications</span>
              <span>5 needed</span>
            </div>
            <ProgressBar value={current} max={5} color="var(--blue)" />
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 16 }}>
            Once you have 5+ applications, we'll analyze your patterns and tell you exactly why your response rate is what it is.
          </div>
        </div>
      </div>
    )
  }

  const { overallGrade, responseRate, keyFindings, topIssues, whatIsWorking, roleAlignmentAnalysis, recommendations, predictedResponseRateIfFixed, motivationalNote, computedStats } = data

  const predRate = typeof predictedResponseRateIfFixed === 'number'
    ? `${predictedResponseRateIfFixed}%`
    : predictedResponseRateIfFixed

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Insights</h1>
          <div style={{ color: 'var(--text-3)', fontSize: 13 }}>
            {computedStats?.total || 0} applications analyzed
          </div>
        </div>
        <div style={{
          background: 'rgba(59,130,246,0.1)',
          border: '1px solid var(--blue)',
          borderRadius: 20,
          color: 'var(--blue)',
          fontSize: 12,
          fontWeight: 600,
          padding: '4px 12px',
        }}>
          Predicted: {predRate} with fixes
        </div>
      </div>

      <GradeCard grade={overallGrade} responseRate={responseRate} />

      {/* Key Findings */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-2)', marginBottom: 14 }}>
          Key Findings
        </h2>
        {(keyFindings || []).map((f, i) => <FindingCard key={i} finding={f} />)}
      </div>

      {/* Top Issues */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-2)', marginBottom: 14 }}>
          Top Issues to Fix
        </h2>
        {(topIssues || []).map((issue, i) => <IssueCard key={i} issue={issue} index={i} />)}
      </div>

      {/* What's Working */}
      {whatIsWorking && whatIsWorking.length > 0 && (
        <div className="card" style={{ marginBottom: 28, padding: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--green)', marginBottom: 12 }}>
            What Is Working
          </h2>
          {whatIsWorking.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0', fontSize: 13, color: 'var(--text-2)' }}>
              <span style={{ color: 'var(--green)', marginTop: 1 }}>✓</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}

      {/* Role Alignment */}
      {roleAlignmentAnalysis && (
        <div className="card" style={{ marginBottom: 28, padding: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-2)', marginBottom: 12 }}>
            Role Alignment Analysis
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, margin: 0 }}>{roleAlignmentAnalysis}</p>
        </div>
      )}

      {/* Recommendations */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-2)', marginBottom: 14 }}>
          Recommendations
        </h2>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <RecommendationCol title="Today" items={recommendations?.immediate} color="var(--red)" />
          <RecommendationCol title="This Week" items={recommendations?.thisWeek} color="var(--yellow)" />
          <RecommendationCol title="Strategic" items={recommendations?.strategic} color="var(--blue)" />
        </div>
      </div>

      {/* Motivational Note */}
      {motivationalNote && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-2)',
          fontSize: 14,
          fontStyle: 'italic',
          lineHeight: 1.7,
          padding: '16px 20px',
          marginBottom: 28,
        }}>
          "{motivationalNote}"
        </div>
      )}
    </div>
  )
}
