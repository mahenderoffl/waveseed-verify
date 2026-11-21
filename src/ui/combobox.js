// ─── combobox.js — a searchable picker (replaces long <select> lists) ─────────
// mountCombobox(host, { placeholder, items, onSelect, emptyText })
//   items: [{ value, label, sub?, avatar?, key? }]   key = extra text to search in
// Keyboard: ↑ ↓ to move, Enter to choose, Esc to close. Click ✕ to clear.
import { icon } from './icons.js';
import { esc, avatar } from './components.js';

let uid = 0;

export function mountCombobox(host, { placeholder = 'Search…', items = [], onSelect = () => {}, emptyText = 'No matches', label = 'Search' } = {}) {
  const id = `cb${++uid}`;
  let selected = null;     // item
  let active = 0;          // highlighted index in the visible list
  let visible = [];
  let open = false;

  host.classList.add('combo');
  host.innerHTML = `
    <div class="input-affix">${icon('search', { size: 17 })}
      <input class="input" id="${id}-input" role="combobox" aria-expanded="false" aria-controls="${id}-list" aria-autocomplete="list" aria-label="${esc(label)}" placeholder="${esc(placeholder)}" autocomplete="off" spellcheck="false">
      <button type="button" class="combo-clear" hidden aria-label="Clear selection">${icon('x', { size: 15 })}</button>
    </div>
    <div class="combo-list" id="${id}-list" role="listbox" hidden></div>`;
  const input = host.querySelector('input');
  const list = host.querySelector('.combo-list');
  const clearBtn = host.querySelector('.combo-clear');

  const norm = (s) => String(s || '').toLowerCase();
  const haystack = (it) => norm(`${it.label} ${it.sub || ''} ${it.key || ''}`);

  const filter = () => {
    const words = norm(input.value === (selected?.label || '') ? '' : input.value).split(/\s+/).filter(Boolean);
    visible = (words.length ? items.filter(it => words.every(w => haystack(it).includes(w))) : items).slice(0, 60);
    active = Math.min(active, Math.max(0, visible.length - 1));
  };

  const render = () => {
    list.innerHTML = visible.length
      ? visible.map((it, i) => `<div class="combo-opt" role="option" id="${id}-o${i}" data-i="${i}" aria-selected="${i === active}">
          ${it.avatar ? avatar(it.avatar, 'sm') : ''}
          <span class="combo-txt"><b>${esc(it.label)}</b>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</span>
          ${selected && selected.value === it.value ? icon('check', { size: 16 }) : ''}</div>`).join('')
      : `<div class="combo-empty">${esc(emptyText)}</div>`;
    input.setAttribute('aria-activedescendant', visible.length ? `${id}-o${active}` : '');
    list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  };

  const show = () => { open = true; filter(); render(); list.hidden = false; input.setAttribute('aria-expanded', 'true'); };
  const hide = () => { open = false; list.hidden = true; input.setAttribute('aria-expanded', 'false'); if (selected) input.value = selected.label; else if (!input.value.trim()) input.value = ''; };

  const choose = (it) => {
    selected = it; input.value = it.label; clearBtn.hidden = false; hide(); onSelect(it.value, it);
  };
  const clear = ({ silent = false } = {}) => {
    selected = null; input.value = ''; clearBtn.hidden = true; if (open) { filter(); render(); }
    if (!silent) onSelect(null, null);
  };

  input.addEventListener('focus', () => { if (selected) input.select(); show(); });
  input.addEventListener('click', () => { if (!open) show(); });
  input.addEventListener('input', () => { active = 0; if (!open) show(); else { filter(); render(); } });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) show(); else { active = Math.min(active + 1, visible.length - 1); render(); } }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); render(); }
    else if (e.key === 'Enter') { if (open && visible[active]) { e.preventDefault(); choose(visible[active]); } }
    else if (e.key === 'Escape') { if (open) { e.preventDefault(); e.stopPropagation(); hide(); } }
  });
  // mousedown (not click) so the choice lands before the input loses focus
  list.addEventListener('mousedown', (e) => { const o = e.target.closest('[data-i]'); if (o) { e.preventDefault(); choose(visible[+o.dataset.i]); } });
  list.addEventListener('mousemove', (e) => { const o = e.target.closest('[data-i]'); if (o && +o.dataset.i !== active) { active = +o.dataset.i; list.querySelectorAll('.combo-opt').forEach((x, i) => x.setAttribute('aria-selected', String(i === active))); } });
  input.addEventListener('blur', () => setTimeout(hide, 120));
  clearBtn.addEventListener('mousedown', (e) => { e.preventDefault(); clear(); input.focus(); });

  return {
    /** Select an item by value without firing onSelect (used when the page pre-fills it). */
    setValue(value) { const it = items.find(x => x.value === value); if (it) { selected = it; input.value = it.label; clearBtn.hidden = false; } },
    clear: () => clear({ silent: true }),
    get value() { return selected ? selected.value : null; },
  };
}
