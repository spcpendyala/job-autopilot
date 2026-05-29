import { useState, useRef, useEffect } from 'react';
import { LOCATION_GROUPS, NORTH_AMERICA_LOCATIONS } from '../lib/locations.js';

const MAX_LOCATIONS = 5;

// Multi-select location picker with grouped dropdown, tag display, and keyboard nav.
// Props: value (array of value strings), onChange(newArray), disabled
export default function LocationPicker({ value = [], onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const containerRef = useRef(null);

  const selected = value
    .map(v => NORTH_AMERICA_LOCATIONS.find(l => l.value === v))
    .filter(Boolean);

  const filtered = query.trim()
    ? NORTH_AMERICA_LOCATIONS.filter(l =>
        l.label.toLowerCase().includes(query.toLowerCase()) &&
        !value.includes(l.value)
      )
    : null; // null means show groups

  const flatFiltered = filtered || NORTH_AMERICA_LOCATIONS.filter(l => !value.includes(l.value));

  function toggle(loc) {
    if (value.includes(loc.value)) {
      onChange(value.filter(v => v !== loc.value));
    } else if (value.length < MAX_LOCATIONS) {
      onChange([...value, loc.value]);
    }
    setQuery('');
    inputRef.current?.focus();
  }

  function remove(val) {
    onChange(value.filter(v => v !== val));
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') { setOpen(false); setQuery(''); return; }
    if (!open) { if (e.key === 'Enter' || e.key === 'ArrowDown') setOpen(true); return; }
    if (e.key === 'ArrowDown') { setCursor(c => Math.min(c + 1, flatFiltered.length - 1)); e.preventDefault(); }
    if (e.key === 'ArrowUp') { setCursor(c => Math.max(c - 1, 0)); e.preventDefault(); }
    if (e.key === 'Enter' && flatFiltered[cursor]) { toggle(flatFiltered[cursor]); e.preventDefault(); }
    if (e.key === 'Backspace' && !query && value.length) { remove(value[value.length - 1]); }
  }

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Scroll cursor into view
  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.querySelector('[data-cursor="true"]');
    item?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  // Reset cursor when query changes
  useEffect(() => { setCursor(0); }, [query]);

  const atMax = value.length >= MAX_LOCATIONS;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Tag row + input */}
      <div
        onClick={() => { if (!disabled) { setOpen(true); inputRef.current?.focus(); } }}
        style={{
          display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center',
          minHeight: '42px', padding: '6px 10px',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          background: disabled ? 'var(--surface)' : 'var(--card)',
          cursor: disabled ? 'not-allowed' : 'text',
          boxSizing: 'border-box',
        }}
      >
        {selected.map(loc => (
          <span
            key={loc.value}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              background: 'var(--blue-dim)',
              color: 'var(--blue)',
              border: '1px solid var(--border-hi)',
              borderRadius: '6px', padding: '2px 8px', fontSize: '13px', fontWeight: 500,
            }}
          >
            {loc.label}
            {!disabled && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); remove(loc.value); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '0 2px', lineHeight: 1,
                  color: 'var(--blue)', fontSize: '15px',
                }}
                aria-label={`Remove ${loc.label}`}
              >×</button>
            )}
          </span>
        ))}

        {!disabled && !atMax && (
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? 'Search locations…' : ''}
            style={{
              border: 'none', outline: 'none', flex: '1 1 120px',
              minWidth: '100px', fontSize: '14px',
              background: 'transparent', color: 'var(--text)',
            }}
          />
        )}
        {atMax && !disabled && (
          <span style={{ fontSize: '12px', color: 'var(--text-3)', marginLeft: '4px' }}>
            Max {MAX_LOCATIONS} locations
          </span>
        )}
      </div>

      {/* Dropdown */}
      {open && !disabled && (
        <div
          ref={listRef}
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            maxHeight: '260px', overflowY: 'auto',
            zIndex: 200,
          }}
        >
          {/* Flat filtered results when typing */}
          {filtered !== null && (
            filtered.length === 0
              ? <div style={{ padding: '12px 16px', color: 'var(--text-3)', fontSize: '13px' }}>
                  No matches
                </div>
              : filtered.map((loc, i) => (
                <PickerRow
                  key={loc.value}
                  loc={loc}
                  isSelected={value.includes(loc.value)}
                  isCursor={cursor === i}
                  atMax={atMax}
                  onClick={() => toggle(loc)}
                />
              ))
          )}

          {/* Grouped display when not typing */}
          {filtered === null && LOCATION_GROUPS.map(grp => {
            const items = grp.items.filter(l => !value.includes(l.value));
            if (items.length === 0) return null;
            return (
              <div key={grp.group}>
                <div style={{
                  padding: '6px 12px 2px',
                  fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--text-3)',
                }}>
                  {grp.group}
                </div>
                {items.map(loc => {
                  const flatIdx = flatFiltered.indexOf(loc);
                  return (
                    <PickerRow
                      key={loc.value}
                      loc={loc}
                      isSelected={value.includes(loc.value)}
                      isCursor={cursor === flatIdx}
                      atMax={atMax}
                      onClick={() => toggle(loc)}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PickerRow({ loc, isSelected, isCursor, atMax, onClick }) {
  return (
    <div
      data-cursor={isCursor || undefined}
      onClick={onClick}
      style={{
        padding: '8px 16px',
        cursor: atMax && !isSelected ? 'not-allowed' : 'pointer',
        background: isCursor ? 'var(--blue-dim)' : 'transparent',
        color: atMax && !isSelected ? 'var(--text-3)' : 'var(--text)',
        fontSize: '14px',
        display: 'flex', alignItems: 'center', gap: '8px',
        userSelect: 'none',
      }}
    >
      <span style={{
        width: '16px', height: '16px', flexShrink: 0,
        border: '2px solid',
        borderColor: isSelected ? 'var(--blue)' : 'var(--border-hi)',
        borderRadius: '4px',
        background: isSelected ? 'var(--blue)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isSelected && <span style={{ color: '#fff', fontSize: '11px', lineHeight: 1 }}>✓</span>}
      </span>
      {loc.label}
    </div>
  );
}
