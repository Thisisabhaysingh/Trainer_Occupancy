import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  Alert, Autocomplete, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, FormControl, FormControlLabel, FormGroup, InputLabel,
  MenuItem, Paper, Select, Stack, Switch, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import { MailOutline } from '@mui/icons-material';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const api = (method, path, data, params) => axios({ method, url: `${apiBaseUrl}/api/school-activity-mail${path}`, data, params, withCredentials: true });
const errorText = (err, fallback) => err.response?.data?.error || fallback;

const GLOBAL_SCOPE = 'global';
const LOOKBACK_LABELS = { 1: 'Today only', 2: 'Today and yesterday', 3: 'Last 3 days', 7: 'Last 7 days' };
const RECIPIENT_OPTIONS = {
  trainer_reminder: [
    { key: 'trainer', label: 'Trainer' },
    { key: 'manager', label: 'Manager' },
    { key: 'school', label: 'School contacts' },
  ],
  school_notice: [
    { key: 'school', label: 'School contacts' },
    { key: 'manager', label: 'Manager' },
    { key: 'trainer', label: 'Trainers of the sessions' },
  ],
};
const STATUS_COLORS = { sent: 'success', skipped: 'warning', failed: 'error', pending: 'default' };
const TYPE_LABELS = { trainer_reminder: 'Trainer reminder', school_notice: 'School mail', test: 'Test' };
const todayKey = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const monthStartKey = () => `${todayKey().slice(0, 7)}-01`;

// Lets the manager choose which details the school mail table shows.
const SchoolContentOptions = ({ fields, value, onChange }) => (
  <Box>
    <Typography variant="subtitle2" fontWeight={700}>What to include in the mail</Typography>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
      The {'{{sessionTable}}'} shows one row per class, with all of that class’s activities in the selected dates in the same row.
    </Typography>
    <FormGroup row>
      {(fields || []).map(field => (
        <FormControlLabel
          key={field.key}
          control={<Checkbox size="small" checked={Boolean(value?.[field.key])} onChange={event => onChange({ ...value, [field.key]: event.target.checked })} />}
          label={<Typography variant="body2">{field.label}</Typography>}
          disabled={(field.key === 'activityDates' || field.key === 'activityStatus') && !value?.activities}
        />
      ))}
    </FormGroup>
  </Box>
);

const EmailChips = ({ label, value, onChange, helperText }) => (
  <Autocomplete
    multiple
    freeSolo
    options={[]}
    value={value}
    onChange={(event, next) => onChange([...new Set(next.flatMap(item => String(item).split(/[,;\s]+/)).map(item => item.trim().toLowerCase()).filter(Boolean))])}
    renderTags={(tags, getTagProps) => tags.map((option, index) => <Chip size="small" label={option} {...getTagProps({ index })} key={option} />)}
    renderInput={params => <TextField {...params} size="small" label={label} placeholder="Type an email and press Enter" helperText={helperText} />}
  />
);

const RecipientEditor = ({ title, type, value, onChange }) => (
  <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>{title}</Typography>
    <FormGroup row sx={{ mb: 1 }}>
      {RECIPIENT_OPTIONS[type].map(option => (
        <FormControlLabel
          key={option.key}
          control={<Checkbox size="small" checked={Boolean(value[option.key])} onChange={event => onChange({ ...value, [option.key]: event.target.checked })} />}
          label={<Typography variant="body2">{option.label}</Typography>}
        />
      ))}
    </FormGroup>
    <EmailChips label="Additional emails" value={value.emails || []} onChange={emails => onChange({ ...value, emails })} />
  </Box>
);

const TemplateEditor = ({ type, draft, setDraft, placeholders, lookbackOptions, contentFields }) => {
  const bodyRef = useRef(null);
  const update = patch => setDraft(current => ({ ...current, ...patch }));
  const insertPlaceholder = key => {
    const token = `{{${key}}}`;
    const input = bodyRef.current;
    const body = draft.bodyTemplate || '';
    const start = input?.selectionStart ?? body.length;
    const end = input?.selectionEnd ?? body.length;
    update({ bodyTemplate: `${body.slice(0, start)}${token}${body.slice(end)}` });
    requestAnimationFrame(() => {
      if (!input) return;
      input.focus();
      input.setSelectionRange(start + token.length, start + token.length);
    });
  };

  return (
    <Stack spacing={2.5}>
      {type === 'trainer_reminder' ? (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <FormControlLabel
              control={<Switch checked={draft.enabled} onChange={event => update({ enabled: event.target.checked })} />}
              label={<Typography fontWeight={600}>{draft.enabled ? 'Automatic delivery is on' : 'Automatic delivery is off'}</Typography>}
            />
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                size="small"
                type="time"
                label="Delivery time (IST)"
                value={draft.sendTime}
                onChange={event => update({ sendTime: event.target.value })}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }}
                sx={{ minWidth: 180 }}
              />
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id="mail-lookback-label">Include unmarked activities from</InputLabel>
                <Select labelId="mail-lookback-label" label="Include unmarked activities from" value={draft.lookbackDays || 1} onChange={event => update({ lookbackDays: Number(event.target.value) })}>
                  {(lookbackOptions || [1]).map(days => <MenuItem key={days} value={days}>{LOOKBACK_LABELS[days] || `Last ${days} days`}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {`Every day at ${draft.sendTime || '--:--'} IST, each trainer who still has assigned school activities with no status (not marked Done or Not completed) gets one mail listing them. Only activities that have already ended are included, and each trainer gets at most one reminder a day.`}
          </Typography>
        </>
      ) : (
        <Typography variant="body2" color="text.secondary">
          School mails are never sent automatically. Set up the template here, then use Send now below to mail a school its session summary for a chosen day.
        </Typography>
      )}

      {type === 'school_notice' && (
        <SchoolContentOptions fields={contentFields} value={draft.contentOptions} onChange={contentOptions => update({ contentOptions })} />
      )}

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <RecipientEditor title="To" type={type} value={draft.toRecipients} onChange={toRecipients => update({ toRecipients })} />
        <RecipientEditor title="CC" type={type} value={draft.ccRecipients} onChange={ccRecipients => update({ ccRecipients })} />
      </Box>

      <TextField size="small" label="Subject" value={draft.subjectTemplate} onChange={event => update({ subjectTemplate: event.target.value })} fullWidth />
      <Box>
        <TextField
          label="Body"
          value={draft.bodyTemplate}
          onChange={event => update({ bodyTemplate: event.target.value })}
          inputRef={bodyRef}
          multiline
          minRows={8}
          fullWidth
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mt: 1 }}>
          <Typography variant="caption" color="text.secondary">Insert:</Typography>
          {(placeholders || []).map(key => (
            <Chip key={key} size="small" variant="outlined" label={`{{${key}}}`} onClick={() => insertPlaceholder(key)} sx={{ fontFamily: 'monospace', fontSize: 11 }} />
          ))}
        </Box>
      </Box>
    </Stack>
  );
};

const PreviewDialog = ({ preview, onClose, action }) => (
  <Dialog open={Boolean(preview)} onClose={onClose} fullWidth maxWidth="md">
    <DialogTitle>Mail preview</DialogTitle>
    <DialogContent dividers>
      {preview && (
        <Stack spacing={1.5}>
          {preview.sample && <Alert severity="info" sx={{ py: 0 }}>Rendered with {preview.sample}.</Alert>}
          <Typography variant="body2"><strong>To:</strong> {preview.to?.length ? preview.to.join(', ') : <Box component="span" sx={{ color: 'error.main' }}>No recipient address found</Box>}</Typography>
          <Typography variant="body2"><strong>CC:</strong> {preview.cc?.length ? preview.cc.join(', ') : '—'}</Typography>
          <Typography variant="body2"><strong>Subject:</strong> {preview.subject}</Typography>
          <Box component="iframe" title="Mail preview" srcDoc={preview.html} sandbox="" sx={{ width: '100%', height: 420, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: '#fff' }} />
        </Stack>
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Close</Button>
      {action}
    </DialogActions>
  </Dialog>
);

export default function SchoolActivityMailSettings({ isAdmin = false }) {
  const [tab, setTab] = useState('trainer_reminder');
  const [scope, setScope] = useState(isAdmin ? GLOBAL_SCOPE : null);
  const [managers, setManagers] = useState([]);
  const [config, setConfig] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [schools, setSchools] = useState([]);
  const [contactDrafts, setContactDrafts] = useState({});
  const [logs, setLogs] = useState([]);
  const [logFilters, setLogFilters] = useState({ type: '', status: '' });
  const [logDetail, setLogDetail] = useState(null);
  const [manualSend, setManualSend] = useState({ schoolId: '', fromDate: monthStartKey(), toDate: todayKey() });
  const rangeInvalid = !manualSend.fromDate || !manualSend.toDate || manualSend.fromDate > manualSend.toDate;

  const notify = (severity, text) => setMessage({ severity, text });

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api('get', '/settings', null, isAdmin ? { scope } : undefined);
      setConfig(response.data);
      setDrafts(response.data.settings);
    } catch (err) {
      notify('error', errorText(err, 'Could not load mail settings.'));
    } finally {
      setLoading(false);
    }
  }, [isAdmin, scope]);

  const loadSchools = useCallback(async () => {
    try {
      const response = await api('get', '/schools');
      setSchools(response.data);
      setContactDrafts(Object.fromEntries(response.data.map(school => [school.id, school.contactEmails])));
    } catch (err) {
      notify('error', errorText(err, 'Could not load schools.'));
    }
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      const params = { ...(isAdmin ? { scope } : {}), ...Object.fromEntries(Object.entries(logFilters).filter(([, value]) => value)) };
      const response = await api('get', '/logs', null, params);
      setLogs(response.data);
    } catch (err) {
      notify('error', errorText(err, 'Could not load the delivery log.'));
    }
  }, [isAdmin, scope, logFilters]);

  const openLog = async id => {
    try {
      const response = await api('get', `/logs/${id}`, null, isAdmin ? { scope } : undefined);
      setLogDetail(response.data);
    } catch (err) {
      notify('error', errorText(err, 'Could not open this mail.'));
    }
  };

  useEffect(() => { loadSettings(); }, [loadSettings]);
  useEffect(() => { loadSchools(); }, [loadSchools]);
  useEffect(() => { if (tab === 'logs') loadLogs(); }, [tab, loadLogs]);
  useEffect(() => {
    if (!isAdmin) return;
    api('get', '/managers').then(response => setManagers(response.data)).catch(() => setManagers([]));
  }, [isAdmin]);

  const scopeLabel = useMemo(() => {
    if (!isAdmin || scope === GLOBAL_SCOPE) return isAdmin ? 'Organisation default' : 'Your team';
    return managers.find(manager => manager.employeeCode === scope)?.name || scope;
  }, [isAdmin, scope, managers]);
  const customized = config && Object.values(config.settings).some(setting => setting.customized);
  const usesDefault = config && config.scope !== GLOBAL_SCOPE && !customized;

  const setDraft = type => updater => setDrafts(current => ({ ...current, [type]: typeof updater === 'function' ? updater(current[type]) : updater }));
  const scopeBody = extra => ({ ...(isAdmin ? { scope } : {}), ...extra });

  const save = async type => {
    setBusy(`save-${type}`);
    try {
      const response = await api('put', '/settings', scopeBody({ settings: { [type]: drafts[type] } }));
      setConfig(current => ({ ...current, settings: response.data.settings }));
      setDrafts(current => ({ ...current, [type]: response.data.settings[type] }));
      notify('success', 'Mail settings saved.');
    } catch (err) {
      notify('error', errorText(err, 'Could not save mail settings.'));
    } finally {
      setBusy('');
    }
  };

  const resetToDefault = async () => {
    setBusy('reset');
    try {
      await api('delete', '/settings', null, isAdmin ? { scope } : undefined);
      await loadSettings();
      notify('success', 'Reverted to the organisation default.');
    } catch (err) {
      notify('error', errorText(err, 'Could not reset settings.'));
    } finally {
      setBusy('');
    }
  };

  const openPreview = async (type, extra = {}) => {
    setBusy(`preview-${type}`);
    try {
      const response = await api('post', '/preview', scopeBody({ type, setting: drafts[type], ...extra }));
      setPreview({ ...response.data, type, extra });
    } catch (err) {
      notify('error', errorText(err, 'Could not build the preview.'));
    } finally {
      setBusy('');
    }
  };

  const sendTest = async type => {
    setBusy(`test-${type}`);
    try {
      const response = await api('post', '/test', scopeBody({ type, setting: drafts[type], ...(type === 'school_notice' ? manualSend : {}) }));
      notify(response.data.status === 'sent' ? 'success' : 'warning', response.data.status === 'sent' ? `Test mail sent to ${response.data.sentTo}.` : `Test mail not sent: ${response.data.error}`);
    } catch (err) {
      notify('error', errorText(err, 'Could not send the test mail.'));
    } finally {
      setBusy('');
    }
  };

  const sendToSchool = async () => {
    setBusy('send-school');
    try {
      const response = await api('post', '/send-school', scopeBody({ ...manualSend, setting: drafts.school_notice }));
      setPreview(null);
      notify(response.data.status === 'sent' ? 'success' : 'warning', response.data.status === 'sent' ? `Mail sent to ${response.data.to.join(', ')}.` : `Mail not sent: ${response.data.error}`);
    } catch (err) {
      notify('error', errorText(err, 'Could not send the mail to the school.'));
    } finally {
      setBusy('');
    }
  };

  const saveContacts = async schoolId => {
    setBusy(`contacts-${schoolId}`);
    try {
      const response = await api('put', `/schools/${schoolId}/contacts`, { emails: contactDrafts[schoolId] || [] });
      setSchools(current => current.map(school => (school.id === schoolId ? response.data : school)));
      notify('success', `Contacts saved for ${response.data.name}.`);
    } catch (err) {
      notify('error', errorText(err, 'Could not save school contacts.'));
    } finally {
      setBusy('');
    }
  };

  const editorActions = type => (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      <Button variant="outlined" onClick={() => openPreview(type, type === 'school_notice' ? manualSend : {})} disabled={Boolean(busy)}>Preview</Button>
      <Button variant="outlined" onClick={() => sendTest(type)} disabled={Boolean(busy)}>{busy === `test-${type}` ? 'Sending…' : 'Send test to me'}</Button>
      <Button variant="contained" onClick={() => save(type)} disabled={Boolean(busy)}>{busy === `save-${type}` ? 'Saving…' : 'Save'}</Button>
    </Box>
  );

  const selectedSchool = schools.find(school => String(school.id) === String(manualSend.schoolId));

  return (
    <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, border: theme => `1px solid ${theme.palette.divider}` }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}><MailOutline sx={{ verticalAlign: 'middle', mr: 1, color: 'primary.main' }} />School Activity Mail</Typography>
          <Typography variant="body2" color="text.secondary">Control automatic reminders when trainers don’t mark their assigned school activity, and mails sent to schools.</Typography>
        </Box>
        {isAdmin && (
          <FormControl size="small" sx={{ minWidth: 260 }}>
            <InputLabel id="mail-scope-label">Settings for</InputLabel>
            <Select labelId="mail-scope-label" label="Settings for" value={scope} onChange={event => setScope(event.target.value)}>
              <MenuItem value={GLOBAL_SCOPE}>Organisation default (all managers)</MenuItem>
              {managers.map(manager => <MenuItem key={manager.employeeCode} value={manager.employeeCode}>{manager.name} ({manager.employeeCode})</MenuItem>)}
            </Select>
          </FormControl>
        )}
      </Box>

      {config && !config.emailEnabled && (
        <Alert severity="warning" sx={{ mb: 2 }}>Email delivery is turned off on the server (EMAIL_ENABLED / SMTP settings). Mails will be logged as skipped until it is enabled.</Alert>
      )}
      {usesDefault && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {scopeLabel} currently follows the organisation default set by the admin. Saving here creates a custom setup for {isAdmin ? 'this manager' : 'your team'}.
        </Alert>
      )}
      {config && customized && config.scope !== GLOBAL_SCOPE && (
        <Alert severity="info" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={resetToDefault} disabled={Boolean(busy)}>Use organisation default</Button>}>
          {scopeLabel} uses a custom mail setup that overrides the organisation default.
        </Alert>
      )}
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)} sx={{ mb: 2 }}>{message.text}</Alert>}

      <Tabs value={tab} onChange={(event, value) => setTab(value)} variant="scrollable" allowScrollButtonsMobile sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="trainer_reminder" label="Unmarked activity reminder" />
        <Tab value="school_notice" label="Mail to school" />
        <Tab value="contacts" label="School contacts" />
        <Tab value="logs" label="Delivery log" />
      </Tabs>

      {loading || !config ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
      ) : (
        <>
          {tab === 'trainer_reminder' && drafts.trainer_reminder && (
            <Stack spacing={2.5}>
              <TemplateEditor type="trainer_reminder" draft={drafts.trainer_reminder} setDraft={setDraft('trainer_reminder')} placeholders={config.placeholders.trainer_reminder} lookbackOptions={config.lookbackOptions} />
              {editorActions('trainer_reminder')}
            </Stack>
          )}

          {tab === 'school_notice' && drafts.school_notice && (
            <Stack spacing={2.5}>
              <TemplateEditor type="school_notice" draft={drafts.school_notice} setDraft={setDraft('school_notice')} placeholders={config.placeholders.school_notice} contentFields={config.schoolContentFields} />
              {editorActions('school_notice')}
              <Divider />
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>Send now</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Uses the template above with the school’s activities between the selected dates{isAdmin && scope === GLOBAL_SCOPE ? ' from all managers' : ''}.</Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                  <FormControl size="small" sx={{ minWidth: 240, flex: '1 1 240px' }}>
                    <InputLabel id="manual-school-label">School</InputLabel>
                    <Select labelId="manual-school-label" label="School" value={manualSend.schoolId} onChange={event => setManualSend(current => ({ ...current, schoolId: event.target.value }))}>
                      {schools.map(school => <MenuItem key={school.id} value={school.id}>{school.name}{school.contactEmails.length ? '' : ' (no contacts)'}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <TextField size="small" type="date" label="From" value={manualSend.fromDate} onChange={event => setManualSend(current => ({ ...current, fromDate: event.target.value }))} InputLabelProps={{ shrink: true }} inputProps={{ max: manualSend.toDate || undefined }} error={rangeInvalid} />
                  <TextField size="small" type="date" label="To" value={manualSend.toDate} onChange={event => setManualSend(current => ({ ...current, toDate: event.target.value }))} InputLabelProps={{ shrink: true }} inputProps={{ min: manualSend.fromDate || undefined }} error={rangeInvalid} helperText={rangeInvalid ? 'From must be on or before To' : ''} />
                  <Button variant="contained" disabled={!manualSend.schoolId || rangeInvalid || Boolean(busy)} onClick={() => openPreview('school_notice', { ...manualSend, manual: true })}>
                    Preview &amp; send
                  </Button>
                </Box>
                {selectedSchool && !selectedSchool.contactEmails.length && drafts.school_notice.toRecipients.school && (
                  <Alert severity="warning" sx={{ mt: 1.5 }}>{selectedSchool.name} has no contact emails. Add them in the School contacts tab.</Alert>
                )}
              </Box>
            </Stack>
          )}

          {tab === 'contacts' && (
            <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700, width: '30%' }}>School</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Contact emails</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, width: 100 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schools.map(school => {
                    const changed = (contactDrafts[school.id] || []).join(',') !== school.contactEmails.join(',');
                    return (
                      <TableRow key={school.id}>
                        <TableCell><Typography variant="body2" fontWeight={600}>{school.name}</Typography></TableCell>
                        <TableCell sx={{ minWidth: 280 }}>
                          <EmailChips label="Emails" value={contactDrafts[school.id] || []} onChange={emails => setContactDrafts(current => ({ ...current, [school.id]: emails }))} />
                        </TableCell>
                        <TableCell align="right">
                          <Button size="small" variant={changed ? 'contained' : 'text'} disabled={!changed || Boolean(busy)} onClick={() => saveContacts(school.id)}>
                            {busy === `contacts-${school.id}` ? 'Saving…' : 'Save'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!schools.length && <TableRow><TableCell colSpan={3} sx={{ color: 'text.secondary' }}>No schools in the catalog yet.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {tab === 'logs' && (
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel id="log-type-label">Mail type</InputLabel>
                  <Select labelId="log-type-label" label="Mail type" value={logFilters.type} onChange={event => setLogFilters(current => ({ ...current, type: event.target.value }))}>
                    <MenuItem value="">All</MenuItem>
                    {Object.entries(TYPE_LABELS).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel id="log-status-label">Status</InputLabel>
                  <Select labelId="log-status-label" label="Status" value={logFilters.status} onChange={event => setLogFilters(current => ({ ...current, status: event.target.value }))}>
                    <MenuItem value="">All</MenuItem>
                    {['sent', 'skipped', 'failed'].map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                  </Select>
                </FormControl>
                <Box sx={{ flex: 1 }} />
                <Button size="small" onClick={loadLogs}>Refresh</Button>
              </Box>
              <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 820 }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      {['When', 'Type', 'School / Trainer', 'To', 'CC', 'Subject', 'Status', ''].map(label => <TableCell key={label} sx={{ fontWeight: 700 }}>{label}</TableCell>)}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {logs.map(log => (
                      <TableRow key={log.id} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(log.sentAt || log.createdAt).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</TableCell>
                        <TableCell>{TYPE_LABELS[log.type] || log.type}{log.triggeredBy !== 'system' && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Manual</Typography>}</TableCell>
                        <TableCell>
                          {[log.schoolName, log.trainerName].filter(Boolean).join(' · ') || '—'}
                          {log.details?.activities?.length > 0 && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{log.details.activities.length} unmarked {log.details.activities.length === 1 ? 'activity' : 'activities'}</Typography>}
                          {log.details?.fromDate && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{log.details.fromDate === log.details.toDate ? log.details.fromDate : `${log.details.fromDate} → ${log.details.toDate}`} · {log.details.sessionCount} sessions</Typography>}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 200, overflowWrap: 'anywhere' }}>{log.toEmails || '—'}</TableCell>
                        <TableCell sx={{ maxWidth: 200, overflowWrap: 'anywhere' }}>{log.ccEmails || '—'}</TableCell>
                        <TableCell sx={{ maxWidth: 260 }}>{log.subject}</TableCell>
                        <TableCell>
                          <Tooltip title={log.error || ''}><Chip size="small" color={STATUS_COLORS[log.status]} label={log.status} /></Tooltip>
                        </TableCell>
                        <TableCell align="right"><Button size="small" onClick={() => openLog(log.id)}>View</Button></TableCell>
                      </TableRow>
                    ))}
                    {!logs.length && <TableRow><TableCell colSpan={8} sx={{ color: 'text.secondary' }}>No mails have been sent yet.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          )}
        </>
      )}

      <Dialog open={Boolean(logDetail)} onClose={() => setLogDetail(null)} fullWidth maxWidth="md">
        <DialogTitle>Delivered mail</DialogTitle>
        <DialogContent dividers>
          {logDetail && (
            <Stack spacing={1.25}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip size="small" color={STATUS_COLORS[logDetail.status]} label={logDetail.status} />
                <Typography variant="body2" color="text.secondary">
                  {TYPE_LABELS[logDetail.type] || logDetail.type} · {logDetail.triggeredBy === 'system' ? `Automated${logDetail.details?.sendTime ? ` at ${logDetail.details.sendTime} IST` : ''}` : `Sent manually by ${logDetail.triggeredBy}`}
                  {' · '}{new Date(logDetail.sentAt || logDetail.createdAt).toLocaleString()}
                </Typography>
              </Box>
              {logDetail.error && <Alert severity={logDetail.status === 'failed' ? 'error' : 'warning'} sx={{ py: 0 }}>{logDetail.error}</Alert>}
              <Typography variant="body2"><strong>To:</strong> {logDetail.toEmails || '—'}</Typography>
              <Typography variant="body2"><strong>CC:</strong> {logDetail.ccEmails || '—'}</Typography>
              <Typography variant="body2"><strong>Subject:</strong> {logDetail.subject}</Typography>
              {logDetail.details?.activities?.length > 0 && (
                <Box>
                  <Typography variant="body2" fontWeight={700}>Unmarked activities included</Typography>
                  {logDetail.details.activities.map(activity => (
                    <Typography key={activity.id} variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {activity.date} {activity.startTime}–{activity.endTime} · {activity.className} · {activity.activityTitle}
                    </Typography>
                  ))}
                </Box>
              )}
              {logDetail.html
                ? <Box component="iframe" title="Delivered mail" srcDoc={logDetail.html} sandbox="" sx={{ width: '100%', height: 420, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: '#fff' }} />
                : <Typography variant="body2" color="text.secondary">The mail body was not stored for this entry.</Typography>}
            </Stack>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setLogDetail(null)}>Close</Button></DialogActions>
      </Dialog>

      <PreviewDialog
        preview={preview}
        onClose={() => setPreview(null)}
        action={preview?.extra?.manual ? (
          <Button variant="contained" onClick={sendToSchool} disabled={Boolean(busy) || !preview.to?.length}>{busy === 'send-school' ? 'Sending…' : 'Send now'}</Button>
        ) : null}
      />
    </Paper>
  );
}
