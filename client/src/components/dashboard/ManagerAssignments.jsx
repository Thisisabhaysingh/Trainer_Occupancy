import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, InputAdornment, List, ListItemButton, ListItemIcon,
  ListItemText, Paper, Stack, TextField, Typography,
} from '@mui/material';
import { AssignmentInd, Search } from '@mui/icons-material';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

const ChecklistPanel = ({ title, hint, items, selected, onToggle, onSetAll, search, onSearch }) => {
  const visible = items.filter(item => `${item.label} ${item.secondary || ''}`.toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <Box sx={{ flex: '1 1 320px', minWidth: 0, border: 1, borderColor: 'divider', borderRadius: 2, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
          <Typography fontWeight={700}>{title} <Typography component="span" variant="body2" color="text.secondary">({selected.size} selected)</Typography></Typography>
          <Box>
            <Button size="small" onClick={() => onSetAll(visible.map(item => item.id), true)}>Select shown</Button>
            <Button size="small" onClick={() => onSetAll(visible.map(item => item.id), false)}>Clear shown</Button>
          </Box>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{hint}</Typography>
        <TextField size="small" fullWidth placeholder={`Search ${title.toLowerCase()}`} value={search} onChange={event => onSearch(event.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} />
      </Box>
      <List dense sx={{ maxHeight: 420, overflowY: 'auto', py: 0 }}>
        {visible.map(item => (
          <ListItemButton key={item.id} onClick={() => onToggle(item.id)} dense>
            <ListItemIcon sx={{ minWidth: 36 }}><Checkbox edge="start" size="small" checked={selected.has(item.id)} tabIndex={-1} disableRipple /></ListItemIcon>
            <ListItemText primary={item.label} secondary={item.secondary} />
          </ListItemButton>
        ))}
        {!visible.length && <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>Nothing matches.</Typography>}
      </List>
    </Box>
  );
};

export default function ManagerAssignments() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [managerId, setManagerId] = useState('');
  const [schoolIds, setSchoolIds] = useState(new Set());
  const [trainerIds, setTrainerIds] = useState(new Set());
  const [searches, setSearches] = useState({ manager: '', school: '', trainer: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${apiBaseUrl}/api/manager-assignments`, { withCredentials: true });
      setData(response.data);
    } catch (err) {
      setMessage({ severity: 'error', text: err.response?.data?.error || 'Could not load manager assignments.' });
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const manager = data?.managers.find(item => item.employeeCode === managerId);
  const selectManager = code => {
    const next = data.managers.find(item => item.employeeCode === code);
    setManagerId(code);
    setSchoolIds(new Set(next?.schoolIds || []));
    setTrainerIds(new Set(next?.trainerIds || []));
    setMessage(null);
  };
  useEffect(() => {
    if (data?.managers.length && !managerId) selectManager(data.managers[0].employeeCode);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const toggle = setter => id => setter(current => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const setAll = setter => (ids, on) => setter(current => {
    const next = new Set(current);
    ids.forEach(id => (on ? next.add(id) : next.delete(id)));
    return next;
  });

  const dirty = manager && (
    [...schoolIds].sort().join(',') !== [...manager.schoolIds].sort().join(',')
    || [...trainerIds].sort().join(',') !== [...manager.trainerIds].sort().join(',')
  );
  const trainerOwners = useMemo(() => {
    const owners = new Map();
    (data?.managers || []).forEach(item => item.trainerIds.forEach(id => owners.set(id, [...(owners.get(id) || []), item.name])));
    return owners;
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      const response = await axios.put(`${apiBaseUrl}/api/manager-assignments/${managerId}`, { schoolIds: [...schoolIds], trainerIds: [...trainerIds] }, { withCredentials: true });
      setData(current => ({
        ...current,
        managers: current.managers.map(item => (item.employeeCode === managerId ? { ...item, schoolIds: response.data.schoolIds, trainerIds: response.data.trainerIds } : item)),
      }));
      setMessage({ severity: 'success', text: `Saved assignments for ${manager.name}.` });
    } catch (err) {
      setMessage({ severity: 'error', text: err.response?.data?.error || 'Could not save assignments.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;

  const visibleManagers = (data?.managers || []).filter(item => `${item.name} ${item.employeeCode}`.toLowerCase().includes(searches.manager.trim().toLowerCase()));

  return (
    <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, border: theme => `1px solid ${theme.palette.divider}` }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={700}><AssignmentInd sx={{ verticalAlign: 'middle', mr: 1, color: 'primary.main' }} />Manager Assignments</Typography>
        <Typography variant="body2" color="text.secondary">
          Choose which schools and trainers each manager handles. A manager with no schools or no trainers assigned keeps the current behaviour (all schools; their branch/department trainers).
        </Typography>
      </Box>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)} sx={{ mb: 2 }}>{message.text}</Alert>}
      {!data?.managers.length ? <Typography color="text.secondary">No managers found.</Typography> : (
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'stretch' }}>
          <Box sx={{ flex: '0 1 260px', minWidth: 220, border: 1, borderColor: 'divider', borderRadius: 2 }}>
            <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
              <Typography fontWeight={700} sx={{ mb: 1 }}>Managers</Typography>
              <TextField size="small" fullWidth placeholder="Search managers" value={searches.manager} onChange={event => setSearches(current => ({ ...current, manager: event.target.value }))} />
            </Box>
            <List dense sx={{ maxHeight: 470, overflowY: 'auto', py: 0 }}>
              {visibleManagers.map(item => (
                <ListItemButton key={item.employeeCode} selected={item.employeeCode === managerId} onClick={() => selectManager(item.employeeCode)}>
                  <ListItemText
                    primary={item.name}
                    secondary={`${item.schoolIds.length ? `${item.schoolIds.length} schools` : 'All schools'} · ${item.trainerIds.length ? `${item.trainerIds.length} trainers` : 'Branch/dept trainers'}`}
                  />
                  {item.role === 'senior_manager' && <Chip size="small" label="Senior" sx={{ ml: 1 }} />}
                </ListItemButton>
              ))}
            </List>
          </Box>

          {manager && (
            <Stack spacing={2} sx={{ flex: '1 1 600px', minWidth: 0 }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <ChecklistPanel
                  title="Schools"
                  hint="Only these schools appear for this manager. Leave empty for all schools."
                  items={data.schools.map(school => ({ id: school.id, label: school.name }))}
                  selected={schoolIds}
                  onToggle={toggle(setSchoolIds)}
                  onSetAll={setAll(setSchoolIds)}
                  search={searches.school}
                  onSearch={value => setSearches(current => ({ ...current, school: value }))}
                />
                <ChecklistPanel
                  title="Trainers"
                  hint="Only these trainers can be scheduled by this manager. Leave empty to use their branch/department."
                  items={data.trainers.map(trainer => {
                    const others = (trainerOwners.get(trainer.employeeCode) || []).filter(name => name !== manager.name);
                    return {
                      id: trainer.employeeCode,
                      label: `${trainer.name} (${trainer.employeeCode})`,
                      secondary: [trainer.branchName, trainer.departmentName, others.length ? `Also with ${others.join(', ')}` : null].filter(Boolean).join(' · '),
                    };
                  })}
                  selected={trainerIds}
                  onToggle={toggle(setTrainerIds)}
                  onSetAll={setAll(setTrainerIds)}
                  search={searches.trainer}
                  onSearch={value => setSearches(current => ({ ...current, trainer: value }))}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button onClick={() => selectManager(managerId)} disabled={!dirty || saving}>Discard changes</Button>
                <Button variant="contained" onClick={save} disabled={!dirty || saving}>{saving ? 'Saving…' : `Save for ${manager.name}`}</Button>
              </Box>
            </Stack>
          )}
        </Box>
      )}
    </Paper>
  );
}
