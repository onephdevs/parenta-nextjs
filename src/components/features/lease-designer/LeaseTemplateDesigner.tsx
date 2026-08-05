'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import {
  SAMPLE_LEASE_CONTEXT,
  type LeaseSignatureMethod,
  type LeaseTemplate,
  type LeaseTemplateSection,
  type LeaseTemplateVariableDef,
} from '@/lib/lease-templates/types';
import { renderTemplateSections } from '@/lib/lease-templates/render';
import { normalizeKeyTermsEditorBody } from '@/lib/lease-templates/key-terms';
import {
  COMPONENT_TYPE_META,
  newUtilityRow,
  parseChoice,
  parseFreeText,
  parseUtilityTable,
  resolveComponentType,
  serializeChoice,
  serializeFreeText,
  serializeUtilityTable,
  type ChoiceConfig,
  type FreeTextConfig,
  type LeaseComponentType,
  type UtilityTableConfig,
} from '@/lib/lease-templates/components';
import {
  AlignLeft,
  AlertTriangle,
  CheckSquare,
  FileText,
  GripVertical,
  List,
  PenLine,
  Plus,
  Printer,
  Save,
  Search,
  Table2,
  Trash2,
  Upload as PublishIcon,
  FileType,
  X,
} from 'lucide-react';

type PageSize = 'letter' | 'a4';

function ClauseTypeIcon({ type }: { type: LeaseComponentType }) {
  const cls = 'h-3.5 w-3.5 shrink-0 text-gray-500';
  switch (type) {
    case 'choice':
      return <CheckSquare className={cls} />;
    case 'utility_table':
      return <Table2 className={cls} />;
    case 'free_text':
      return <AlignLeft className={cls} />;
    case 'signatures':
      return <PenLine className={cls} />;
    case 'key_terms':
      return <List className={cls} />;
    default:
      return <List className={cls} />;
  }
}

function insertAtCursor(
  value: string,
  token: string,
  start: number,
  end: number
): { next: string; caret: number } {
  const next = value.slice(0, start) + token + value.slice(end);
  return { next, caret: start + token.length };
}

function UtilityTableEditor({
  config,
  onChange,
}: {
  config: UtilityTableConfig;
  onChange: (c: UtilityTableConfig) => void;
}) {
  const dragId = useRef<string | null>(null);

  const reorder = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const ids = config.rows.map((r) => r.id);
    const fromIdx = ids.indexOf(fromId);
    const toIdx = ids.indexOf(toId);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = [...config.rows];
    const [item] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, item);
    onChange({ ...config, rows: next });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Multiple rows can be checked; each has its own tenant-pays percentage.
      </p>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-gray-600">Intro line</span>
        <input
          type="text"
          value={config.intro}
          onChange={(e) => onChange({ ...config, intro: e.target.value })}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </label>
      <ul className="space-y-2">
        {config.rows.map((row) => (
          <li
            key={row.id}
            draggable
            onDragStart={() => {
              dragId.current = row.id;
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragId.current) reorder(dragId.current, row.id);
              dragId.current = null;
            }}
            className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${
              row.checked
                ? 'border-gray-200 bg-white'
                : 'border-dashed border-gray-300 bg-gray-50/80 opacity-75'
            }`}
          >
            <span className="cursor-grab text-gray-400 active:cursor-grabbing">
              <GripVertical className="h-4 w-4" />
            </span>
            <input
              type="checkbox"
              checked={row.checked}
              onChange={(e) =>
                onChange({
                  ...config,
                  rows: config.rows.map((r) =>
                    r.id === row.id
                      ? {
                          ...r,
                          checked: e.target.checked,
                          tenantPaysPercent: e.target.checked
                            ? r.tenantPaysPercent ?? 50
                            : null,
                        }
                      : r
                  ),
                })
              }
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <input
              type="text"
              value={row.label}
              onChange={(e) =>
                onChange({
                  ...config,
                  rows: config.rows.map((r) =>
                    r.id === row.id ? { ...r, label: e.target.value } : r
                  ),
                })
              }
              className="min-w-0 flex-1 border-0 bg-transparent text-sm font-medium text-gray-900 focus:outline-none focus:ring-0"
            />
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={100}
                disabled={!row.checked}
                value={row.checked && row.tenantPaysPercent != null ? row.tenantPaysPercent : ''}
                placeholder="—"
                onChange={(e) => {
                  const v = e.target.value === '' ? null : Number(e.target.value);
                  onChange({
                    ...config,
                    rows: config.rows.map((r) =>
                      r.id === row.id ? { ...r, tenantPaysPercent: v } : r
                    ),
                  });
                }}
                className="w-14 rounded border border-gray-200 px-1.5 py-1 text-center text-sm disabled:bg-transparent disabled:text-gray-400"
              />
              <span className="text-xs text-gray-500">%</span>
            </div>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...config,
                  rows: config.rows.filter((r) => r.id !== row.id),
                })
              }
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              title="Remove row"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() =>
          onChange({ ...config, rows: [...config.rows, newUtilityRow('Other')] })
        }
        className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-900"
      >
        <Plus className="h-4 w-4" />
        Add utility row
      </button>
    </div>
  );
}

function ChoiceEditor({
  config,
  onChange,
}: {
  config: ChoiceConfig;
  onChange: (c: ChoiceConfig) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        {config.exclusive
          ? 'Select one — mutually exclusive options (checkbox style).'
          : 'Multiple options can be checked.'}
      </p>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-gray-600">
          Hint after title (e.g. select one)
        </span>
        <input
          type="text"
          value={config.selectHint || ''}
          onChange={(e) => onChange({ ...config, selectHint: e.target.value })}
          placeholder="(select one)"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={config.exclusive}
          onChange={(e) => onChange({ ...config, exclusive: e.target.checked })}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        Mutually exclusive (select one)
      </label>
      <ul className="space-y-3">
        {config.options.map((opt) => (
          <li
            key={opt.id}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2.5"
          >
            <div className="flex items-start gap-2">
              <input
                type={config.exclusive ? 'radio' : 'checkbox'}
                name="choice-preview"
                checked={opt.selected}
                onChange={() => {
                  if (config.exclusive) {
                    onChange({
                      ...config,
                      options: config.options.map((o) => ({
                        ...o,
                        selected: o.id === opt.id,
                      })),
                    });
                  } else {
                    onChange({
                      ...config,
                      options: config.options.map((o) =>
                        o.id === opt.id ? { ...o, selected: !o.selected } : o
                      ),
                    });
                  }
                }}
                className="mt-1 border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="mt-0.5 w-5 shrink-0 text-xs font-semibold text-gray-500">
                {opt.letter})
              </span>
              <textarea
                value={opt.label}
                rows={2}
                onChange={(e) =>
                  onChange({
                    ...config,
                    options: config.options.map((o) =>
                      o.id === opt.id ? { ...o, label: e.target.value } : o
                    ),
                  })
                }
                className="min-w-0 flex-1 resize-y rounded border border-gray-200 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            {opt.nested && opt.nested.length > 0 && (
              <div className="ml-8 mt-2 flex flex-wrap gap-3 border-t border-gray-100 pt-2">
                {opt.nested.map((n) => (
                  <label key={n.id} className="flex items-center gap-1.5 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={n.selected}
                      onChange={() =>
                        onChange({
                          ...config,
                          options: config.options.map((o) =>
                            o.id !== opt.id
                              ? o
                              : {
                                  ...o,
                                  nested: o.nested?.map((nn) => ({
                                    ...nn,
                                    selected: nn.id === n.id ? !nn.selected : false,
                                  })),
                                }
                          ),
                        })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {n.label}
                  </label>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FreeTextEditor({
  config,
  onChange,
}: {
  config: FreeTextConfig;
  onChange: (c: FreeTextConfig) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        If empty, the printable page shows blank underlined lines for handwriting. Typed text
        replaces those blanks.
      </p>
      <textarea
        value={config.text}
        onChange={(e) => onChange({ ...config, text: e.target.value })}
        rows={8}
        placeholder="e.g. No smoking indoors; quiet hours 10PM–7AM."
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <label className="flex items-center gap-2 text-sm text-gray-700">
        Blank lines when empty
        <input
          type="number"
          min={1}
          max={8}
          value={config.blankLineCount}
          onChange={(e) =>
            onChange({
              ...config,
              blankLineCount: Math.max(1, Number(e.target.value) || 3),
            })
          }
          className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
        />
      </label>
    </div>
  );
}

function TokenEditor({
  value,
  onChange,
  onRequestInsertRef,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onRequestInsertRef: React.MutableRefObject<((token: string) => void) | null>;
  placeholder?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    onRequestInsertRef.current = (token: string) => {
      const el = textareaRef.current;
      const start = el?.selectionStart ?? value.length;
      const end = el?.selectionEnd ?? value.length;
      const { next, caret } = insertAtCursor(value, token, start, end);
      onChange(next);
      requestAnimationFrame(() => {
        if (el) {
          el.focus();
          el.setSelectionRange(caret, caret);
        }
      });
    };
  }, [value, onChange, onRequestInsertRef]);

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500">
        Write full sentences. Press Enter for a new line. Insert variables where blanks should
        appear in the printable page.
      </p>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={14}
        className="w-full resize-y rounded-lg border border-gray-300 px-3 py-3 text-sm leading-relaxed text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        style={{ fontFamily: 'Georgia, "Times New Roman", serif', whiteSpace: 'pre-wrap' }}
        placeholder={
          placeholder ||
          'This Room Rental Agreement ("Agreement") is made on {{lease.startDate}}, by and between:\n\nLandlord: {{landlord.companyName}} ("Landlord"), AND\n\nTenant(s): {{tenant.name}} ("Tenant").'
        }
      />
      <p className="text-xs text-gray-500">
        Click a variable on the left to insert at the cursor. Blank lines in the editor become
        paragraph breaks on the page.
      </p>
    </div>
  );
}

function SignaturesEditor({
  template,
  onChange,
}: {
  template: LeaseTemplate;
  onChange: (patch: Partial<LeaseTemplate>) => void;
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500">
        Fixed layout: Signature / Print Name / Date for each party. Not customized per template —
        only method and audit settings below.
      </p>
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 font-serif text-sm text-gray-700">
        {["Landlord's Signature:", "Tenant's Signature:", ...(template.requireWitness ? ["Witness's Signature:"] : [])].map(
          (label) => (
            <div
              key={label}
              className="mb-4 grid grid-cols-3 gap-3 last:mb-0"
            >
              <div className="flex items-end gap-1 border-b border-gray-400 pb-0.5">
                <span className="shrink-0 text-xs">{label}</span>
              </div>
              <div className="flex items-end gap-1 border-b border-gray-400 pb-0.5">
                <span className="shrink-0 text-xs">Print Name:</span>
              </div>
              <div className="flex items-end gap-1 border-b border-gray-400 pb-0.5">
                <span className="shrink-0 text-xs">Date:</span>
              </div>
            </div>
          )
        )}
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-gray-900">Clickwrap method</p>
        <div className="space-y-2">
          {(
            [
              { id: 'typed_name', label: 'Typed name' },
              { id: 'drawn', label: 'Drawn signature' },
              { id: 'upload', label: 'Upload image' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange({ signatureMethod: opt.id as LeaseSignatureMethod })}
              className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm ${
                template.signatureMethod === opt.id
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={template.requireWitness}
          onChange={(e) => onChange({ requireWitness: e.target.checked })}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        Require witness row
      </label>
    </div>
  );
}

export default function LeaseTemplateDesigner() {
  const { showNotification } = useNotifications();
  const insertRef = useRef<((token: string) => void) | null>(null);
  const dragSectionId = useRef<string | null>(null);
  const previewRefs = useRef<Record<string, HTMLElement | null>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [templates, setTemplates] = useState<LeaseTemplate[]>([]);
  const [template, setTemplate] = useState<LeaseTemplate | null>(null);
  const [variables, setVariables] = useState<LeaseTemplateVariableDef[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [sectionDraft, setSectionDraft] = useState('');
  const [titleDraft, setTitleDraft] = useState('');
  const [utilityConfig, setUtilityConfig] = useState<UtilityTableConfig>(() =>
    parseUtilityTable('')
  );
  const [choiceConfig, setChoiceConfig] = useState<ChoiceConfig>(() => parseChoice(''));
  const [freeTextConfig, setFreeTextConfig] = useState<FreeTextConfig>(() => parseFreeText(''));
  const [dirty, setDirty] = useState(false);
  const [variableSearch, setVariableSearch] = useState('');
  const [pageSize, setPageSize] = useState<PageSize>('letter');
  const [addOpen, setAddOpen] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [addType, setAddType] = useState<LeaseComponentType>('rich_text');
  const [deleteTarget, setDeleteTarget] = useState<LeaseTemplateSection | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const activeSection = useMemo(() => {
    if (!template || !activeSectionId) return null;
    return template.sections.find((s) => s.id === activeSectionId) || null;
  }, [template, activeSectionId]);

  const activeType = useMemo(() => {
    if (!activeSection) return 'rich_text' as LeaseComponentType;
    return resolveComponentType(activeSection.sectionKey, activeSection.body);
  }, [activeSection]);

  const sortedSections = useMemo(() => {
    if (!template) return [];
    return [...template.sections].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [template]);

  const clauseNumber = useMemo(() => {
    const map = new Map<string, number>();
    let n = 0;
    for (const s of sortedSections) {
      if (s.sectionKey === 'signatures') continue;
      n += 1;
      map.set(s.id, n);
    }
    return map;
  }, [sortedSections]);

  const filteredVariables = useMemo(() => {
    const q = variableSearch.trim().toLowerCase();
    if (!q) return variables.slice(0, 12);
    return variables.filter(
      (v) =>
        v.label.toLowerCase().includes(q) ||
        v.key.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q)
    );
  }, [variables, variableSearch]);

  const bodyForSection = useCallback(
    (section: LeaseTemplateSection, isActive: boolean): string => {
      if (!isActive) return section.body;
      switch (resolveComponentType(section.sectionKey, section.body)) {
        case 'utility_table':
          return serializeUtilityTable(utilityConfig);
        case 'choice':
          return serializeChoice(choiceConfig);
        case 'free_text':
          return serializeFreeText(freeTextConfig);
        case 'signatures':
          return section.body;
        case 'key_terms':
          // Editable as plain sentence text (legacy JSON is converted on open)
          return sectionDraft;
        default:
          return sectionDraft;
      }
    },
    [utilityConfig, choiceConfig, freeTextConfig, sectionDraft]
  );

  const overallPreviewSections = useMemo(() => {
    if (!template) return [];
    const sectionsForPreview = sortedSections.map((s) => ({
      ...s,
      title: s.id === activeSectionId ? titleDraft.trim() || s.title : s.title,
      body: bodyForSection(s, s.id === activeSectionId),
    }));
    return renderTemplateSections(sectionsForPreview, SAMPLE_LEASE_CONTEXT, {
      highlight: true,
      requireWitness: template.requireWitness,
    });
  }, [template, sortedSections, activeSectionId, bodyForSection, titleDraft]);

  useEffect(() => {
    const key = activeSection?.sectionKey;
    if (!key) return;
    const el = previewRefs.current[key];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeSection?.sectionKey, overallPreviewSections]);

  const hydrateSection = (section: LeaseTemplateSection): boolean => {
    const type = resolveComponentType(section.sectionKey, section.body);
    setTitleDraft(section.title);
    setUtilityConfig(
      type === 'utility_table' ? parseUtilityTable(section.body) : parseUtilityTable('')
    );
    setChoiceConfig(
      type === 'choice'
        ? parseChoice(section.body, section.sectionKey)
        : parseChoice('', section.sectionKey)
    );
    setFreeTextConfig(type === 'free_text' ? parseFreeText(section.body) : parseFreeText(''));

    if (type === 'key_terms') {
      const { text, converted } = normalizeKeyTermsEditorBody(section.body);
      setSectionDraft(text);
      if (converted) {
        setTemplate((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            sections: prev.sections.map((s) =>
              s.id === section.id ? { ...s, body: text } : s
            ),
          };
        });
      }
      return converted;
    }

    setSectionDraft(section.body);
    return false;
  };

  const applyTemplate = useCallback((t: LeaseTemplate) => {
    setTemplate(t);
    const prefer =
      t.sections.find((s) => s.sectionKey === 'key_terms') ||
      t.sections.find((s) => s.sectionKey === 'utilities') ||
      t.sections.find((s) => resolveComponentType(s.sectionKey, s.body) === 'utility_table') ||
      t.sections[0];
    setActiveSectionId(prefer?.id || null);
    if (prefer) {
      const converted = hydrateSection(prefer);
      setDirty(converted);
    } else {
      setDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const tplRes = await fetch('/api/lease-templates?scope=all');
      const data = await tplRes.json();
      if (tplRes.status === 503 && data.code === 'MIGRATION_REQUIRED') {
        setMigrationRequired(true);
        setVariables(data.data?.variables || []);
        setTemplate(null);
        return;
      }
      if (!tplRes.ok || !data.success) {
        throw new Error(data.error || 'Failed to load');
      }

      setMigrationRequired(false);
      setVariables(data.data.variables || []);
      const list: LeaseTemplate[] = (data.data.templates || []).filter(
        (t: LeaseTemplate) => t.status !== 'archived'
      );
      setTemplates(list);

      const global =
        list.find((t) => !t.buildingId && t.id === data.data.activeTemplateId) ||
        list.find((t) => !t.buildingId) ||
        list[0];
      if (global) applyTemplate(global);
    } catch (err) {
      console.error(err);
      showNotification({
        type: 'error',
        title: 'Load failed',
        message: err instanceof Error ? err.message : 'Could not load lease templates',
      });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyTemplate]);

  useEffect(() => {
    void load();
  }, [load]);

  const flushActiveToTemplate = (): LeaseTemplate | null => {
    if (!template || !activeSection) return template;
    const body = bodyForSection(activeSection, true);
    const next = {
      ...template,
      sections: template.sections.map((s) =>
        s.id === activeSection.id
          ? { ...s, body, title: titleDraft.trim() || s.title }
          : s
      ),
    };
    setTemplate(next);
    return next;
  };

  const selectSection = (section: LeaseTemplateSection) => {
    if (dirty && activeSection && activeSection.id !== section.id) {
      flushActiveToTemplate();
    }
    setActiveSectionId(section.id);
    const converted = hydrateSection(section);
    setDirty(converted);
  };

  /** Apply server template without flushing a deleted/stale active section back into state. */
  const adoptTemplate = (
    nextTemplate: LeaseTemplate,
    options?: { selectSectionId?: string | null; preferFirst?: boolean }
  ) => {
    dragSectionId.current = null;
    setDirty(false);
    setTemplate(nextTemplate);
    setTemplates((prev) =>
      prev.some((t) => t.id === nextTemplate.id)
        ? prev.map((t) => (t.id === nextTemplate.id ? nextTemplate : t))
        : prev
    );

    const sections = [...nextTemplate.sections].sort((a, b) => a.sortOrder - b.sortOrder);
    let next: LeaseTemplateSection | null = null;
    if (options?.selectSectionId) {
      next = sections.find((s) => s.id === options.selectSectionId) || null;
    }
    if (!next && options?.preferFirst !== false) {
      next = sections[0] || null;
    }

    setActiveSectionId(next?.id || null);
    if (next) {
      const converted = hydrateSection(next);
      setDirty(converted);
    } else {
      setSectionDraft('');
      setTitleDraft('');
      setDirty(false);
    }
  };

  const markDirty = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setDirty(true);
  };

  const persistSection = async () => {
    if (!template || !activeSection) return;
    if (activeType === 'signatures') {
      setDirty(false);
      showNotification({
        type: 'success',
        title: 'Saved',
        message: 'Signature layout is fixed; method settings save automatically',
      });
      return;
    }

    setSaving(true);
    try {
      const body = bodyForSection(activeSection, true);
      const title = titleDraft.trim() || activeSection.title;
      const res = await fetch(`/api/lease-templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateSection',
          sectionId: activeSection.id,
          body,
          title,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setTemplate(data.data);
      setTemplates((prev) => prev.map((t) => (t.id === data.data.id ? data.data : t)));
      setDirty(false);
      showNotification({
        type: 'success',
        title: 'Draft saved',
        message: `"${title}" saved`,
      });
    } catch (err) {
      showNotification({
        type: 'error',
        title: 'Save failed',
        message: err instanceof Error ? err.message : 'Could not save section',
      });
    } finally {
      setSaving(false);
    }
  };

  const requestDeleteSection = (section: LeaseTemplateSection) => {
    if (section.sectionKey === 'signatures') {
      showNotification({
        type: 'error',
        title: 'Cannot remove',
        message: 'The signature block is required on every lease.',
      });
      return;
    }
    setDeleteTarget(section);
  };

  const confirmDeleteSection = async () => {
    if (!template || !deleteTarget) return;
    const section = deleteTarget;
    setDeleting(true);
    try {
      const res = await fetch(`/api/lease-templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteSection', sectionId: section.id }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const nextTemplate = data.data as LeaseTemplate;
      const wasActive = activeSectionId === section.id;

      adoptTemplate(nextTemplate, {
        selectSectionId: wasActive ? undefined : activeSectionId,
        preferFirst: true,
      });

      setDeleteTarget(null);
      showNotification({
        type: 'success',
        title: 'Clause removed',
        message: `"${section.title}" deleted`,
      });
    } catch (err) {
      showNotification({
        type: 'error',
        title: 'Delete failed',
        message: err instanceof Error ? err.message : 'Could not remove clause',
      });
    } finally {
      setDeleting(false);
    }
  };

  const persistSigning = async (patch: Partial<LeaseTemplate>) => {
    if (!template) return;
    setTemplate({ ...template, ...patch });
    try {
      const res = await fetch(`/api/lease-templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureMethod: patch.signatureMethod ?? template.signatureMethod,
          requireWitness: patch.requireWitness ?? template.requireWitness,
          auditIp: patch.auditIp ?? template.auditIp,
          auditTimestamp: patch.auditTimestamp ?? template.auditTimestamp,
          auditUserAgent: patch.auditUserAgent ?? template.auditUserAgent,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setTemplate(data.data);
    } catch (err) {
      showNotification({
        type: 'error',
        title: 'Update failed',
        message: err instanceof Error ? err.message : 'Could not update signing settings',
      });
      void load();
    }
  };

  const handlePublish = async () => {
    if (!template) return;
    if (dirty && activeType !== 'signatures') await persistSection();
    setSaving(true);
    try {
      const res = await fetch(`/api/lease-templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setTemplate(data.data);
      setTemplates((prev) => prev.map((t) => (t.id === data.data.id ? data.data : t)));
      showNotification({
        type: 'success',
        title: 'Published',
        message: data.message || 'Template published',
      });
    } catch (err) {
      showNotification({
        type: 'error',
        title: 'Publish failed',
        message: err instanceof Error ? err.message : 'Could not publish',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetCompact = async () => {
    if (!template) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/lease-templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resetCompact' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setResetConfirmOpen(false);
      adoptTemplate(data.data as LeaseTemplate, { preferFirst: true });
      showNotification({
        type: 'success',
        title: 'Compact template',
        message: data.message || 'Reset to compact 1-page layout',
      });
    } catch (err) {
      showNotification({
        type: 'error',
        title: 'Reset failed',
        message: err instanceof Error ? err.message : 'Could not reset template',
      });
    } finally {
      setSaving(false);
    }
  };

  const defaultBodyForType = (type: LeaseComponentType): string => {
    switch (type) {
      case 'utility_table':
        return serializeUtilityTable(parseUtilityTable(''));
      case 'choice':
        return serializeChoice({
          intro: '',
          exclusive: true,
          options: [
            { id: 'a', letter: 'a', label: 'Option A', selected: true },
            { id: 'b', letter: 'b', label: 'Option B', selected: false },
          ],
        });
      case 'free_text':
        return serializeFreeText({ text: '', blankLineCount: 3 });
      case 'signatures':
        return 'By signing below, the parties acknowledge they have read and agree to all terms.';
      default:
        return '';
    }
  };

  const handleAddSection = async () => {
    if (!template || !addTitle.trim()) return;
    const key = addTitle
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    const sectionKey =
      addType === 'utility_table'
        ? key || 'utilities'
        : addType === 'free_text'
          ? key || 'additional_terms'
          : addType === 'signatures'
            ? 'signatures'
            : key || `section_${Date.now()}`;
    try {
      const res = await fetch(`/api/lease-templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addSection',
          sectionKey,
          title: addTitle.trim(),
          body: defaultBodyForType(addType),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setTemplate(data.data);
      setAddOpen(false);
      setAddTitle('');
      const newest = [...data.data.sections].sort(
        (a: LeaseTemplateSection, b: LeaseTemplateSection) => b.sortOrder - a.sortOrder
      )[0];
      if (newest) selectSection(newest);
    } catch (err) {
      showNotification({
        type: 'error',
        title: 'Add failed',
        message: err instanceof Error ? err.message : 'Could not add clause',
      });
    }
  };

  const persistReorder = async (orderedIds: string[]) => {
    if (!template) return;
    setTemplate((prev) => {
      if (!prev) return prev;
      const byId = new Map(prev.sections.map((s) => [s.id, s]));
      const sections = orderedIds
        .map((id, idx) => {
          const s = byId.get(id);
          return s ? { ...s, sortOrder: idx } : null;
        })
        .filter(Boolean) as LeaseTemplateSection[];
      return { ...prev, sections };
    });
    try {
      const res = await fetch(`/api/lease-templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reorder', orderedSectionIds: orderedIds }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setTemplate(data.data);
    } catch (err) {
      showNotification({
        type: 'error',
        title: 'Reorder failed',
        message: err instanceof Error ? err.message : 'Could not save order',
      });
      void load();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportStub = (kind: 'pdf' | 'word') => {
    showNotification({
      type: 'info',
      title: kind === 'pdf' ? 'PDF export' : 'Word export',
      message: `Export as ${kind.toUpperCase()} (${pageSize === 'letter' ? 'US Letter' : 'A4'}) will use this layout — wiring next.`,
    });
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
        Loading lease designer…
      </div>
    );
  }

  if (migrationRequired) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <h3 className="font-semibold text-amber-900">Database migration required</h3>
            <p className="mt-1 text-sm text-amber-800">
              Run{' '}
              <code className="rounded bg-amber-100 px-1">
                migrations/add-lease-template-cms.sql
              </code>{' '}
              against your database, then reload.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
        No lease template found.
      </div>
    );
  }

  const statusLabel =
    template.status === 'published'
      ? `V${template.version} · Published`
      : `V${template.version} · Draft`;

  const pageWidthClass = pageSize === 'letter' ? 'max-w-[8.5in]' : 'max-w-[210mm]';

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="truncate text-base font-semibold text-gray-900">{template.name}</h2>
            <span className="text-xs text-gray-500">{statusLabel}</span>
            {dirty && (
              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                Unsaved
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => setPageSize(e.target.value as PageSize)}
            className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
            title="Page size for export / preview"
          >
            <option value="letter">US Letter</option>
            <option value="a4">A4</option>
          </select>
          <button
            type="button"
            onClick={() => setResetConfirmOpen(true)}
            className="text-xs text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline"
            title="Replace clauses with compact 1-page defaults"
          >
            Use compact template
          </button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void persistSection()}
            isLoading={saving}
            leftIcon={<Save className="h-4 w-4" />}
          >
            Save draft
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void handlePublish()}
            isLoading={saving}
            leftIcon={<PublishIcon className="h-4 w-4" />}
            className="bg-gray-900 hover:bg-gray-800"
          >
            Publish…
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-h-[36rem] min-w-[960px] grid-cols-[220px_minmax(0,1.1fr)_minmax(340px,1fr)] divide-x divide-gray-100">
          {/* Column 1 — Clauses + variables */}
          <aside className="flex max-h-[calc(100vh-9rem)] flex-col bg-white">
            <div className="flex-1 overflow-y-auto px-3 py-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Clauses
              </p>
              <ul className="space-y-0.5">
                {sortedSections.map((section) => {
                  const type = resolveComponentType(section.sectionKey, section.body);
                  const active = section.id === activeSectionId;
                  const num = clauseNumber.get(section.id);
                  const label =
                    section.sectionKey === 'signatures'
                      ? 'Signatures'
                      : num
                        ? `${num}) ${section.title}`
                        : section.title;
                  return (
                    <li
                      key={section.id}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        const from = dragSectionId.current;
                        dragSectionId.current = null;
                        if (!from || from === section.id) return;
                        const ids = sortedSections.map((s) => s.id);
                        const fromIdx = ids.indexOf(from);
                        const toIdx = ids.indexOf(section.id);
                        if (fromIdx < 0 || toIdx < 0) return;
                        const next = [...ids];
                        next.splice(fromIdx, 1);
                        next.splice(toIdx, 0, from);
                        void persistReorder(next);
                      }}
                    >
                      <div
                        className={`group flex w-full items-center gap-0.5 rounded-md ${
                          active ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <span
                          draggable
                          onDragStart={(e) => {
                            dragSectionId.current = section.id;
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragEnd={() => {
                            dragSectionId.current = null;
                          }}
                          className="cursor-grab px-1 py-1.5 text-gray-300 active:cursor-grabbing"
                          title="Drag to reorder"
                        >
                          <GripVertical className="h-3.5 w-3.5" />
                        </span>
                        <button
                          type="button"
                          onClick={() => selectSection(section)}
                          className={`flex min-w-0 flex-1 items-center gap-1.5 py-1.5 pr-1 text-left text-[13px] ${
                            active ? 'font-medium text-blue-900' : 'text-gray-700'
                          }`}
                        >
                          <ClauseTypeIcon type={type} />
                          <span className="min-w-0 truncate">{label}</span>
                        </button>
                        {section.sectionKey !== 'signatures' && (
                          <button
                            type="button"
                            title="Remove clause"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              requestDeleteSection(section);
                            }}
                            className="mr-1 shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 focus:bg-red-50 focus:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {!addOpen ? (
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-gray-300 px-2 py-2 text-sm font-medium text-gray-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-800"
                >
                  <Plus className="h-4 w-4" />
                  Add clause
                </button>
              ) : (
                <div className="mt-3 space-y-2 rounded-md border border-gray-200 bg-gray-50 p-2.5">
                  <input
                    type="text"
                    value={addTitle}
                    onChange={(e) => setAddTitle(e.target.value)}
                    placeholder="Clause title"
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                    autoFocus
                  />
                  <select
                    value={addType}
                    onChange={(e) => setAddType(e.target.value as LeaseComponentType)}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                  >
                    <option value="rich_text">Text clause</option>
                    <option value="choice">Checkbox options</option>
                    <option value="utility_table">Utility allocation table</option>
                    <option value="free_text">Free-text addendum</option>
                  </select>
                  <div className="flex gap-1.5">
                    <Button type="button" size="sm" onClick={() => void handleAddSection()}>
                      Add
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAddOpen(false);
                        setAddTitle('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 px-3 py-3">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Variables
              </p>
              <div className="relative mb-2">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={variableSearch}
                  onChange={(e) => setVariableSearch(e.target.value)}
                  placeholder="Search variables"
                  className="w-full rounded-md border border-gray-200 py-1.5 pl-7 pr-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto">
                {filteredVariables.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => {
                      if (
                        activeType === 'rich_text' ||
                        activeType === 'key_terms' ||
                        activeType === 'choice'
                      ) {
                        insertRef.current?.(v.token);
                        setDirty(true);
                      } else {
                        void navigator.clipboard?.writeText(v.token);
                        showNotification({
                          type: 'info',
                          title: 'Copied',
                          message: v.token,
                        });
                      }
                    }}
                    className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-700 hover:bg-blue-100 hover:text-blue-800"
                    title={v.description}
                  >
                    {v.key}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Column 2 — Editor */}
          <section className="flex max-h-[calc(100vh-9rem)] flex-col overflow-hidden bg-white">
            {activeSection ? (
              <>
                <div className="border-b border-gray-100 px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {activeSection.sectionKey === 'signatures' ? (
                      <h3 className="text-lg font-semibold text-gray-900">Signatures</h3>
                    ) : (
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                        <span className="text-lg font-semibold text-gray-500">
                          {clauseNumber.get(activeSection.id) || ''})
                        </span>
                        <input
                          type="text"
                          value={titleDraft}
                          onChange={(e) => {
                            setTitleDraft(e.target.value);
                            setDirty(true);
                          }}
                          className="min-w-0 flex-1 rounded-md border border-transparent px-1.5 py-0.5 text-lg font-semibold text-gray-900 hover:border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Clause title"
                        />
                      </div>
                    )}
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                      {COMPONENT_TYPE_META[activeType].label}
                    </span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  {activeType === 'utility_table' && (
                    <UtilityTableEditor
                      config={utilityConfig}
                      onChange={markDirty(setUtilityConfig)}
                    />
                  )}
                  {activeType === 'choice' && (
                    <ChoiceEditor config={choiceConfig} onChange={markDirty(setChoiceConfig)} />
                  )}
                  {activeType === 'free_text' && (
                    <FreeTextEditor
                      config={freeTextConfig}
                      onChange={markDirty(setFreeTextConfig)}
                    />
                  )}
                  {activeType === 'signatures' && (
                    <SignaturesEditor template={template} onChange={(p) => void persistSigning(p)} />
                  )}
                  {(activeType === 'rich_text' || activeType === 'key_terms') && (
                    <TokenEditor
                      value={sectionDraft}
                      onChange={markDirty(setSectionDraft)}
                      onRequestInsertRef={insertRef}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
                Select a clause
              </div>
            )}
          </section>

          {/* Column 3 — Printable preview */}
          <aside className="flex max-h-[calc(100vh-9rem)] flex-col overflow-hidden bg-slate-100/80">
            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2.5">
              <p className="text-sm font-medium text-gray-900">Printable preview</p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  title="Print"
                >
                  <Printer className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleExportStub('pdf')}
                  className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  title="Export PDF"
                >
                  <FileText className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleExportStub('word')}
                  className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  title="Export Word"
                >
                  <FileType className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div
                className={`lease-page mx-auto ${pageWidthClass} border border-gray-300 bg-white px-9 py-8 shadow-sm`}
                style={{
                  fontFamily: 'Times New Roman, Times, Georgia, serif',
                  fontSize: '12.5px',
                  lineHeight: 1.55,
                  color: '#111',
                }}
              >
                <h1
                  className="mb-5 text-center font-bold uppercase text-black"
                  style={{
                    fontSize: '16px',
                    letterSpacing: '0.02em',
                    textDecoration: 'underline',
                    textUnderlineOffset: '3px',
                  }}
                >
                  Room Rental Agreement
                </h1>

                <div className="lease-clauses">
                  {overallPreviewSections.map((sec, idx) => {
                    const isActive = sec.sectionKey === activeSection?.sectionKey;
                    const isSig = sec.sectionKey === 'signatures';
                    const num = isSig
                      ? null
                      : overallPreviewSections
                          .slice(0, idx + 1)
                          .filter((s) => s.sectionKey !== 'signatures').length;

                    if (isSig) {
                      return (
                        <div
                          key={sec.sectionKey}
                          ref={(el) => {
                            previewRefs.current[sec.sectionKey] = el;
                          }}
                          className={`mt-6 ${isActive ? 'rounded ring-2 ring-blue-300 ring-offset-2' : ''}`}
                        >
                          <div
                            className="lease-preview-body"
                            dangerouslySetInnerHTML={{ __html: sec.html }}
                          />
                        </div>
                      );
                    }

                    return (
                      <div
                        key={sec.sectionKey}
                        ref={(el) => {
                          previewRefs.current[sec.sectionKey] = el;
                        }}
                        className={`lease-clause mb-3.5 ${isActive ? 'rounded bg-blue-50/40 ring-2 ring-blue-300 ring-offset-1' : ''}`}
                      >
                        <div className="lease-preview-body">
                          <strong>
                            {num}) {sec.printableTitle || sec.title.toUpperCase()}:
                          </strong>{' '}
                          <span
                            className="lease-clause-text"
                            dangerouslySetInnerHTML={{ __html: sec.html }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="mt-8 text-right font-sans text-[10px] text-gray-500">
                  Page 1 of 1
                </p>
              </div>

              <style>{`
                .lease-page .lease-clause {
                  display: block;
                }
                .lease-page .lease-preview-body {
                  display: block;
                  text-align: left;
                  white-space: normal;
                  word-wrap: break-word;
                  overflow-wrap: break-word;
                }
                .lease-page .lease-clause-text {
                  display: inline;
                }
                .lease-page .lease-clause-text br {
                  display: block;
                  content: '';
                  margin-top: 0.35em;
                }
                .lease-page .fill {
                  text-decoration: underline;
                  text-underline-offset: 2px;
                  font-weight: 600;
                }
                .lease-page .select-hint {
                  font-weight: 400;
                  font-style: italic;
                }
                .lease-page .choice-list {
                  display: block;
                  margin-top: 0.45rem;
                  margin-left: 0.15rem;
                }
                .lease-page .choice-row {
                  display: block;
                  margin: 0.35rem 0;
                }
                .lease-page .choice-nested {
                  margin: 0.35rem 0 0.45rem 1.5rem;
                  display: flex;
                  flex-wrap: wrap;
                  gap: 1rem;
                }
                .lease-page .cb {
                  font-family: 'Segoe UI Symbol', 'Apple Symbols', sans-serif;
                }
                .lease-page .util-table {
                  display: block;
                  margin-top: 0.45rem;
                }
                .lease-page .util-row {
                  display: grid;
                  grid-template-columns: 1.4rem 1.1rem minmax(7rem, 11rem) auto 1fr;
                  column-gap: 0.35rem;
                  align-items: baseline;
                  margin: 0.25rem 0;
                }
                .lease-page .util-row--muted {
                  color: #9ca3af;
                }
                .lease-page .util-num {
                  font-weight: 600;
                }
                .lease-page .blank-pct {
                  display: inline-block;
                  min-width: 2.25rem;
                  border-bottom: 1px solid #374151;
                  text-align: center;
                }
                .lease-page .blank-line {
                  border-bottom: 1px solid #111;
                  height: 1.35rem;
                  margin: 0.45rem 0 0.2rem;
                }
                .lease-page .sig-block {
                  margin-top: 0.5rem;
                }
                .lease-page .sig-row {
                  display: grid;
                  grid-template-columns: 1.35fr 1.1fr 0.85fr;
                  gap: 0.75rem;
                  margin-bottom: 1.15rem;
                  align-items: end;
                }
                .lease-page .sig-col {
                  display: flex;
                  align-items: flex-end;
                  gap: 0.35rem;
                  min-width: 0;
                }
                .lease-page .sig-label {
                  white-space: nowrap;
                  font-size: 12px;
                }
                .lease-page .sig-line {
                  flex: 1;
                  border-bottom: 1px solid #111;
                  min-width: 3rem;
                  height: 1.1rem;
                }
              `}</style>
            </div>
          </aside>
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={() => void confirmDeleteSection()}
        title="Remove clause"
        message={
          deleteTarget
            ? `Remove “${deleteTarget.title}” from this template? You can add it again later, or use compact template to restore defaults.`
            : ''
        }
        confirmText="Remove"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleting}
      />

      <ConfirmDialog
        isOpen={resetConfirmOpen}
        onClose={() => {
          if (!saving) setResetConfirmOpen(false);
        }}
        onConfirm={() => void handleResetCompact()}
        title="Use compact template"
        message="Replace all clauses with the compact 1-page Room Rental Agreement? Unsaved edits will be lost."
        confirmText="Replace"
        cancelText="Cancel"
        variant="warning"
        isLoading={saving}
      />
    </div>
  );
}
