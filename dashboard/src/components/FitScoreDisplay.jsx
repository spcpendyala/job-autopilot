function scoreColor(score) {
  if (score >= 8) return '#22c55e'
  if (score >= 6) return '#eab308'
  return '#ef4444'
}

function Bar({ label, value }) {
  const pct = Math.round((value / 10) * 100)
  const color = scoreColor(value)
  return (
    <div className="score-bar-row">
      <span className="score-bar-label">{label}</span>
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="score-bar-num">{value}/10</span>
    </div>
  )
}

export default function FitScoreDisplay({ fitScore, atsGaps }) {
  if (!fitScore) return null
  const b = fitScore.scoringBreakdown || {}
  const color = scoreColor(fitScore.score)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 8 }}>
        <span style={{ fontSize: 64, fontWeight: 800, color, lineHeight: 1 }}>{fitScore.score}</span>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{fitScore.verdict}</div>
          <div style={{ color: '#888', fontSize: 13 }}>{fitScore.oneLineSummary}</div>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ color: '#888', fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 10 }}>
          Score Breakdown
        </div>
        <Bar label="Skills Match" value={b.skillsMatch} />
        <Bar label="Experience Level" value={b.experienceLevel} />
        <Bar label="Tools Match" value={b.toolsMatch} />
        <Bar label="Role Alignment" value={b.roleAlignment} />
      </div>

      <div className="two-col" style={{ marginBottom: 20 }}>
        <div>
          <div style={{ color: '#22c55e', fontSize: 11, fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: 8 }}>
            Top Matching Skills
          </div>
          {(fitScore.topMatchingSkills || []).map((s, i) => (
            <div key={i} style={{ color: '#d0d0d0', fontSize: 13, marginBottom: 4 }}>✓ {s}</div>
          ))}
        </div>
        <div>
          <div style={{ color: '#ef4444', fontSize: 11, fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: 8 }}>
            Key Gaps
          </div>
          {(fitScore.keyGaps || []).map((g, i) => (
            <div key={i} style={{ color: '#d0d0d0', fontSize: 13, marginBottom: 4 }}>✗ {g}</div>
          ))}
        </div>
      </div>

      {atsGaps && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: '#888', fontSize: 11, fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: 10 }}>
            ATS Keywords to Add
          </div>
          {(atsGaps.criticalMissing || []).length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ color: '#888', fontSize: 12, marginRight: 8 }}>Critical:</span>
              <span className="kw-list" style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
                {(atsGaps.criticalMissing || []).map((k, i) => (
                  <span key={i} className="kw-badge" style={{ background: '#3d1515', color: '#ef4444' }}>{k}</span>
                ))}
              </span>
            </div>
          )}
          {(atsGaps.niceToHaveMissing || []).length > 0 && (
            <div>
              <span style={{ color: '#888', fontSize: 12, marginRight: 8 }}>Nice to have:</span>
              <span className="kw-list" style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
                {(atsGaps.niceToHaveMissing || []).map((k, i) => (
                  <span key={i} className="kw-badge" style={{ background: '#3d2e00', color: '#eab308' }}>{k}</span>
                ))}
              </span>
            </div>
          )}
        </div>
      )}

      {(fitScore.tailoringTips || []).length > 0 && (
        <div>
          <div style={{ color: '#888', fontSize: 11, fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: 10 }}>
            Tailoring Tips
          </div>
          <ol style={{ paddingLeft: 18 }}>
            {fitScore.tailoringTips.map((t, i) => (
              <li key={i} style={{ color: '#d0d0d0', fontSize: 13, marginBottom: 6 }}>{t}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
