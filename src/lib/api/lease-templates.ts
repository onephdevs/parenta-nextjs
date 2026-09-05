/**
 * Lease template CMS — database access.
 */

import pool from '@/lib/db';
import {
  DEFAULT_SECTION_DEFS,
  type LeaseSignatureMethod,
  type LeaseTemplate,
  type LeaseTemplateSection,
  type LeaseTemplateStatus,
  type LeaseSectionConditionKey,
} from '@/lib/lease-templates/types';

function mapSection(row: Record<string, unknown>): LeaseTemplateSection {
  return {
    id: String(row.id),
    templateId: String(row.template_id),
    sectionKey: String(row.section_key),
    title: String(row.title),
    body: String(row.body || ''),
    sortOrder: Number(row.sort_order || 0),
    isEnabled: row.is_enabled !== false,
    conditionKey: (row.condition_key as LeaseSectionConditionKey) || null,
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function mapTemplate(
  row: Record<string, unknown>,
  sections: LeaseTemplateSection[]
): LeaseTemplate {
  return {
    id: String(row.id),
    buildingId: row.building_id ? String(row.building_id) : null,
    name: String(row.name),
    description: row.description ? String(row.description) : null,
    status: row.status as LeaseTemplateStatus,
    version: Number(row.version || 1),
    signatureMethod: (row.signature_method as LeaseSignatureMethod) || 'typed_name',
    requireWitness: row.require_witness !== false,
    auditIp: row.audit_ip !== false,
    auditTimestamp: row.audit_timestamp !== false,
    auditUserAgent: row.audit_user_agent !== false,
    isSystem: row.is_system === true,
    publishedAt: row.published_at ? String(row.published_at) : null,
    createdBy: row.created_by ? String(row.created_by) : null,
    updatedBy: row.updated_by ? String(row.updated_by) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    sections,
  };
}

async function loadSections(templateId: string): Promise<LeaseTemplateSection[]> {
  const result = await pool.query(
    `SELECT * FROM lease_template_sections
     WHERE template_id = $1
     ORDER BY sort_order ASC, created_at ASC`,
    [templateId]
  );
  return result.rows.map(mapSection);
}

export async function leaseTemplatesTableExists(): Promise<boolean> {
  const r = await pool.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'lease_templates'
     LIMIT 1`
  );
  return r.rows.length > 0;
}

async function insertDefaultSections(templateId: string): Promise<void> {
  for (const def of DEFAULT_SECTION_DEFS) {
    await pool.query(
      `INSERT INTO lease_template_sections (
         template_id, section_key, title, body, sort_order, is_enabled, condition_key
       ) VALUES ($1, $2, $3, $4, $5, true, $6)`,
      [
        templateId,
        def.sectionKey,
        def.title,
        def.body,
        def.sortOrder,
        def.conditionKey,
      ]
    );
  }
}

/**
 * Ensure a global draft (and optionally published) system template exists.
 */
export async function ensureDefaultLeaseTemplate(
  userId?: string | null
): Promise<LeaseTemplate> {
  const existing = await pool.query(
    `SELECT * FROM lease_templates
     WHERE building_id IS NULL
     ORDER BY
       CASE status WHEN 'published' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END,
       updated_at DESC
     LIMIT 1`
  );

  if (existing.rows[0]) {
    const sections = await loadSections(String(existing.rows[0].id));
    if (sections.length === 0) {
      await insertDefaultSections(String(existing.rows[0].id));
      return mapTemplate(existing.rows[0], await loadSections(String(existing.rows[0].id)));
    }
    return mapTemplate(existing.rows[0], sections);
  }

  const created = await pool.query(
    `INSERT INTO lease_templates (
       building_id, name, description, status, version,
       signature_method, require_witness, is_system, created_by, updated_by
     ) VALUES (
       NULL, 'Room Rental Agreement', 'Compact 1-page room rental agreement',
       'draft', 1, 'typed_name', false, true, $1, $1
     ) RETURNING *`,
    [userId || null]
  );

  const templateId = String(created.rows[0].id);
  await insertDefaultSections(templateId);

  const refreshed = await pool.query(`SELECT * FROM lease_templates WHERE id = $1`, [
    templateId,
  ]);
  return mapTemplate(refreshed.rows[0], await loadSections(templateId));
}

export async function listLeaseTemplates(options?: {
  buildingId?: string | null;
  status?: LeaseTemplateStatus;
}): Promise<LeaseTemplate[]> {
  const params: unknown[] = [];
  let where = 'WHERE 1=1';
  if (options?.buildingId) {
    params.push(options.buildingId);
    where += ` AND building_id = $${params.length}`;
  } else if (options?.buildingId === null) {
    where += ' AND building_id IS NULL';
  }
  if (options?.status) {
    params.push(options.status);
    where += ` AND status = $${params.length}`;
  }

  const result = await pool.query(
    `SELECT * FROM lease_templates ${where} ORDER BY updated_at DESC`,
    params
  );

  const templates: LeaseTemplate[] = [];
  for (const row of result.rows) {
    templates.push(mapTemplate(row, await loadSections(String(row.id))));
  }
  return templates;
}

export async function getLeaseTemplateById(id: string): Promise<LeaseTemplate | null> {
  const result = await pool.query(`SELECT * FROM lease_templates WHERE id = $1`, [id]);
  if (!result.rows[0]) return null;
  return mapTemplate(result.rows[0], await loadSections(id));
}

/**
 * Resolve which template to use for a building: published building override, else global published.
 */
export async function getPublishedLeaseTemplate(
  buildingId?: string | null
): Promise<LeaseTemplate | null> {
  if (buildingId) {
    const building = await pool.query(
      `SELECT * FROM lease_templates
       WHERE building_id = $1 AND status = 'published'
       ORDER BY version DESC LIMIT 1`,
      [buildingId]
    );
    if (building.rows[0]) {
      return mapTemplate(
        building.rows[0],
        await loadSections(String(building.rows[0].id))
      );
    }
  }

  const global = await pool.query(
    `SELECT * FROM lease_templates
     WHERE building_id IS NULL AND status = 'published'
     ORDER BY version DESC LIMIT 1`
  );
  if (!global.rows[0]) return null;
  return mapTemplate(global.rows[0], await loadSections(String(global.rows[0].id)));
}

export async function updateLeaseTemplate(
  id: string,
  updates: {
    name?: string;
    description?: string | null;
    signatureMethod?: LeaseSignatureMethod;
    requireWitness?: boolean;
    auditIp?: boolean;
    auditTimestamp?: boolean;
    auditUserAgent?: boolean;
    updatedBy?: string | null;
  }
): Promise<LeaseTemplate | null> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  const map: Array<[keyof typeof updates, string]> = [
    ['name', 'name'],
    ['description', 'description'],
    ['signatureMethod', 'signature_method'],
    ['requireWitness', 'require_witness'],
    ['auditIp', 'audit_ip'],
    ['auditTimestamp', 'audit_timestamp'],
    ['auditUserAgent', 'audit_user_agent'],
    ['updatedBy', 'updated_by'],
  ];

  for (const [key, col] of map) {
    if (updates[key] !== undefined) {
      sets.push(`${col} = $${i++}`);
      values.push(updates[key]);
    }
  }

  if (sets.length === 0) return getLeaseTemplateById(id);

  sets.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  await pool.query(
    `UPDATE lease_templates SET ${sets.join(', ')} WHERE id = $${i}`,
    values
  );
  return getLeaseTemplateById(id);
}

export async function updateLeaseTemplateSection(
  sectionId: string,
  updates: {
    title?: string;
    body?: string;
    sortOrder?: number;
    isEnabled?: boolean;
    conditionKey?: LeaseSectionConditionKey;
  }
): Promise<LeaseTemplateSection | null> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (updates.title !== undefined) {
    sets.push(`title = $${i++}`);
    values.push(updates.title);
  }
  if (updates.body !== undefined) {
    sets.push(`body = $${i++}`);
    values.push(updates.body);
  }
  if (updates.sortOrder !== undefined) {
    sets.push(`sort_order = $${i++}`);
    values.push(updates.sortOrder);
  }
  if (updates.isEnabled !== undefined) {
    sets.push(`is_enabled = $${i++}`);
    values.push(updates.isEnabled);
  }
  if (updates.conditionKey !== undefined) {
    sets.push(`condition_key = $${i++}`);
    values.push(updates.conditionKey);
  }

  if (sets.length === 0) {
    const r = await pool.query(`SELECT * FROM lease_template_sections WHERE id = $1`, [
      sectionId,
    ]);
    return r.rows[0] ? mapSection(r.rows[0]) : null;
  }

  sets.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(sectionId);

  const result = await pool.query(
    `UPDATE lease_template_sections SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return result.rows[0] ? mapSection(result.rows[0]) : null;
}

export async function reorderLeaseTemplateSections(
  templateId: string,
  orderedSectionIds: string[]
): Promise<LeaseTemplateSection[]> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let idx = 0; idx < orderedSectionIds.length; idx++) {
      await client.query(
        `UPDATE lease_template_sections
         SET sort_order = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND template_id = $3`,
        [idx, orderedSectionIds[idx], templateId]
      );
    }
    await client.query(
      `UPDATE lease_templates SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [templateId]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return loadSections(templateId);
}

export async function addLeaseTemplateSection(
  templateId: string,
  data: {
    sectionKey: string;
    title: string;
    body?: string;
    conditionKey?: LeaseSectionConditionKey;
  }
): Promise<LeaseTemplateSection> {
  const max = await pool.query(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM lease_template_sections WHERE template_id = $1`,
    [templateId]
  );
  const result = await pool.query(
    `INSERT INTO lease_template_sections (
       template_id, section_key, title, body, sort_order, condition_key
     ) VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      templateId,
      data.sectionKey,
      data.title,
      data.body || '',
      Number(max.rows[0].next),
      data.conditionKey || null,
    ]
  );
  return mapSection(result.rows[0]);
}

export async function deleteLeaseTemplateSection(
  templateId: string,
  sectionId: string
): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM lease_template_sections
     WHERE id = $1 AND template_id = $2
     RETURNING id`,
    [sectionId, templateId]
  );
  if (!result.rows[0]) return false;
  await pool.query(
    `UPDATE lease_templates SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [templateId]
  );
  return true;
}

/**
 * Replace all sections with the compact 1-page Room Rental Agreement defaults.
 */
export async function resetLeaseTemplateToCompactDefaults(
  templateId: string,
  userId?: string | null
): Promise<LeaseTemplate | null> {
  const existing = await getLeaseTemplateById(templateId);
  if (!existing) return null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM lease_template_sections WHERE template_id = $1`, [
      templateId,
    ]);
    for (const def of DEFAULT_SECTION_DEFS) {
      await client.query(
        `INSERT INTO lease_template_sections (
           template_id, section_key, title, body, sort_order, is_enabled, condition_key
         ) VALUES ($1, $2, $3, $4, $5, true, $6)`,
        [
          templateId,
          def.sectionKey,
          def.title,
          def.body,
          def.sortOrder,
          def.conditionKey,
        ]
      );
    }
    await client.query(
      `UPDATE lease_templates
       SET name = 'Room Rental Agreement',
           description = 'Compact 1-page room rental agreement',
           status = 'draft',
           require_witness = false,
           updated_by = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [templateId, userId || null]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return getLeaseTemplateById(templateId);
}

/**
 * Publish: bump version, mark published. Keeps one published per scope.
 * Creates an immutable version bump — existing snapshots stay on old wording.
 */
export async function publishLeaseTemplate(
  id: string,
  userId?: string | null
): Promise<LeaseTemplate | null> {
  const current = await getLeaseTemplateById(id);
  if (!current) return null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (current.buildingId) {
      await client.query(
        `UPDATE lease_templates SET status = 'archived', updated_at = CURRENT_TIMESTAMP
         WHERE building_id = $1 AND status = 'published' AND id <> $2`,
        [current.buildingId, id]
      );
    } else {
      await client.query(
        `UPDATE lease_templates SET status = 'archived', updated_at = CURRENT_TIMESTAMP
         WHERE building_id IS NULL AND status = 'published' AND id <> $1`,
        [id]
      );
    }

    await client.query(
      `UPDATE lease_templates
       SET status = 'published',
           version = version + CASE WHEN status = 'published' THEN 0 ELSE 1 END,
           published_at = CURRENT_TIMESTAMP,
           updated_by = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id, userId || null]
    );

    // If already published and editing, bump version explicitly
    if (current.status === 'published') {
      await client.query(
        `UPDATE lease_templates SET version = version + 1 WHERE id = $1`,
        [id]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return getLeaseTemplateById(id);
}

export async function saveLeaseAgreementSnapshot(data: {
  documentId: string;
  templateId: string | null;
  templateVersion: number | null;
  templateName: string | null;
  resolvedHtml: string;
  contextJson: unknown;
  sectionsJson: unknown;
}): Promise<void> {
  await pool.query(
    `INSERT INTO lease_agreement_snapshots (
       document_id, template_id, template_version, template_name,
       resolved_html, context_json, sections_json
     ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
     ON CONFLICT (document_id) DO UPDATE SET
       template_id = EXCLUDED.template_id,
       template_version = EXCLUDED.template_version,
       template_name = EXCLUDED.template_name,
       resolved_html = EXCLUDED.resolved_html,
       context_json = EXCLUDED.context_json,
       sections_json = EXCLUDED.sections_json,
       created_at = CURRENT_TIMESTAMP`,
    [
      data.documentId,
      data.templateId,
      data.templateVersion,
      data.templateName,
      data.resolvedHtml,
      JSON.stringify(data.contextJson ?? {}),
      JSON.stringify(data.sectionsJson ?? []),
    ]
  );
}

/**
 * Clone a template (usually the global published one) into a building-specific draft override.
 * If a non-archived override already exists for the building, returns it instead.
 */
export async function cloneLeaseTemplateForBuilding(
  buildingId: string,
  options?: {
    sourceTemplateId?: string | null;
    userId?: string | null;
    buildingName?: string | null;
  }
): Promise<LeaseTemplate> {
  const existing = await pool.query(
    `SELECT * FROM lease_templates
     WHERE building_id = $1 AND status IN ('draft', 'published')
     ORDER BY
       CASE status WHEN 'draft' THEN 0 WHEN 'published' THEN 1 ELSE 2 END,
       updated_at DESC
     LIMIT 1`,
    [buildingId]
  );
  if (existing.rows[0]) {
    return mapTemplate(
      existing.rows[0],
      await loadSections(String(existing.rows[0].id))
    );
  }

  let sourceId = options?.sourceTemplateId || null;
  if (!sourceId) {
    const global = await getPublishedLeaseTemplate(null);
    if (!global) {
      const ensured = await ensureDefaultLeaseTemplate(options?.userId);
      sourceId = ensured.id;
    } else {
      sourceId = global.id;
    }
  }

  if (!sourceId) {
    throw new Error('Source template not found');
  }

  const source = await getLeaseTemplateById(sourceId);
  if (!source) {
    throw new Error('Source template not found');
  }

  const name = options?.buildingName
    ? `${source.name} — ${options.buildingName}`
    : `${source.name} (building override)`;

  const created = await pool.query(
    `INSERT INTO lease_templates (
       building_id, name, description, status, version,
       signature_method, require_witness, audit_ip, audit_timestamp, audit_user_agent,
       is_system, created_by, updated_by
     ) VALUES (
       $1, $2, $3, 'draft', 1,
       $4, $5, $6, $7, $8,
       false, $9, $9
     ) RETURNING *`,
    [
      buildingId,
      name,
      `Building override cloned from "${source.name}" v${source.version}`,
      source.signatureMethod,
      source.requireWitness,
      source.auditIp,
      source.auditTimestamp,
      source.auditUserAgent,
      options?.userId || null,
    ]
  );

  const newId = String(created.rows[0].id);
  for (const section of source.sections) {
    await pool.query(
      `INSERT INTO lease_template_sections (
         template_id, section_key, title, body, sort_order, is_enabled, condition_key
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        newId,
        section.sectionKey,
        section.title,
        section.body,
        section.sortOrder,
        section.isEnabled,
        section.conditionKey,
      ]
    );
  }

  return mapTemplate(created.rows[0], await loadSections(newId));
}
