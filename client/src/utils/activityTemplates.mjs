// Preserve the Employee dropdown's sorting and missing-session defaults for
// every role that now follows Employee template rules.
export function employeeActivityTemplates(data) {
  const templates = [...(Array.isArray(data) ? data : [])].sort((a, b) =>
    (a?.title || '').toLowerCase().localeCompare((b?.title || '').toLowerCase()));
  const titles = new Set(templates.map(item => (item?.title || '').toLowerCase()));
  for (const template of [
    { id: 'default-school-session', title: 'School Session' },
    { id: 'default-institute-session', title: 'Institute Session' },
  ]) {
    if (!titles.has(template.title.toLowerCase())) templates.push(template);
  }
  return templates;
}
