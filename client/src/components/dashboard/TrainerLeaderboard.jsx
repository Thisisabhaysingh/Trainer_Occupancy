import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tooltip, Typography,
} from '@mui/material';
import { ArrowDropDown, ArrowDropUp, EmojiEvents } from '@mui/icons-material';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const REFRESH_INTERVAL_MS = 30000;
const MEDAL_COLORS = { 1: '#D4AF37', 2: '#A7A7AD', 3: '#B87333' };

const RankMovement = ({ rank, previousRank }) => {
  if (!previousRank || previousRank === rank) return null;
  const improved = rank < previousRank;
  const Icon = improved ? ArrowDropUp : ArrowDropDown;
  return (
    <Tooltip title={`Was #${previousRank}`}>
      <Icon fontSize="small" sx={{ verticalAlign: 'middle', color: improved ? 'success.main' : 'error.main' }} />
    </Tooltip>
  );
};

const RankBadge = ({ rank, size = 28 }) => (
  <Avatar sx={{
    width: size, height: size, fontSize: size * 0.45, fontWeight: 700,
    bgcolor: MEDAL_COLORS[rank] || 'action.selected',
    color: MEDAL_COLORS[rank] ? '#fff' : 'text.primary',
  }}>
    {rank}
  </Avatar>
);

const useTrainerLeaderboard = () => {
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const response = await axios.get(`${apiBaseUrl}/api/trainer-leaderboard`, { params: { limit: 50 }, withCredentials: true });
      setBoard(response.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load the leaderboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load({ silent: true });
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  return { board, loading, error, reload: load };
};

const LeaderboardTable = ({ board }) => {
  const me = board.me;
  const myRowVisible = me && board.top.some(row => row.userId === me.userId);
  const renderRow = (row, highlight) => (
    <TableRow key={row.userId} hover sx={highlight ? { bgcolor: 'action.selected' } : undefined}>
      <TableCell sx={{ width: 64 }}><RankBadge rank={row.rank} /></TableCell>
      <TableCell>
        <Typography variant="body2" fontWeight={highlight ? 700 : 600}>
          {row.name}{highlight && ' (You)'}
          <RankMovement rank={row.rank} previousRank={row.previousRank} />
        </Typography>
        {row.branchName && <Typography variant="caption" color="text.secondary">{row.branchName}</Typography>}
      </TableCell>
      <TableCell align="right">{row.instituteSessions}</TableCell>
      <TableCell align="right">{row.schoolSessions}</TableCell>
      <TableCell align="right"><Typography variant="body2" fontWeight={700}>{row.score}</Typography></TableCell>
    </TableRow>
  );

  return (
    <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflowX: 'auto' }}>
      <Table size="small" sx={{ minWidth: 480 }}>
        <TableHead>
          <TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell sx={{ fontWeight: 700 }}>Rank</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Trainer</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>Institute</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>School</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>Score</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {board.top.map(row => renderRow(row, row.userId === me?.userId))}
          {me && !myRowVisible && (
            <>
              <TableRow><TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 0.5 }}>⋯</TableCell></TableRow>
              {renderRow(me, true)}
            </>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// Compact card sized to sit in the dashboard's top card row; the full table
// opens in a dialog. Managers aren't ranked, so viewerMode="manager" shows the
// team standings instead of the viewer's own rank.
export default function TrainerLeaderboard({ cardSx, titleSx, accentColor, viewerMode = 'trainer' }) {
  const { board, loading, error, reload } = useTrainerLeaderboard();
  const [open, setOpen] = useState(false);

  const isManagerView = viewerMode === 'manager';
  const me = isManagerView ? null : board?.me;
  const leader = board?.top[0];
  const podium = board?.top.slice(0, 3) || [];
  const periodLabel = board?.periodKey
    ? new Date(`${board.periodKey}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : '';

  return (
    <Paper
      elevation={0}
      sx={{ ...cardSx, p: 0, overflow: 'hidden', height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}
    >
      {accentColor && (
        <Box sx={{
          height: 4, bgcolor: accentColor, borderRadius: '3px 3px 0 0', position: 'relative', flexShrink: 0,
          '&::after': { content: '""', position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)', width: '60%', height: 8, bgcolor: accentColor, borderRadius: '0 0 16px 16px' },
        }} />
      )}
      <Box sx={{ p: 2.5, pb: 4, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography sx={{ fontWeight: 600, fontSize: 16, ...titleSx, color: 'text.primary', display: 'flex', alignItems: 'center' }}>
          <EmojiEvents sx={{ mr: 1, fontSize: 21, color: MEDAL_COLORS[1] }} /> Leaderboard
        </Typography>
        <Chip size="small" color="success" variant="outlined" label="Live" sx={{ height: 20, fontSize: 11 }} />
      </Box>

      {loading && !board ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress size={24} /></Box>
      ) : error && !board ? (
        <Alert severity="error" sx={{ py: 0 }}>{error}</Alert>
      ) : (
        <>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
            {isManagerView ? (
              <>
                <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.65rem', md: '1.9rem' }, lineHeight: 1.1 }}>{board.totalRanked}</Typography>
                <Typography variant="body2" color="text.secondary" noWrap sx={{ fontWeight: 500, minWidth: 0 }}>
                  {board.totalRanked === 1 ? 'trainer ranked' : 'trainers ranked'}{leader ? ` · leader ${leader.score} pts` : ''}
                </Typography>
              </>
            ) : (
              <>
                <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.65rem', md: '1.9rem' }, lineHeight: 1.1 }}>
                  {me ? `#${me.rank}` : '—'}
                  {me && <RankMovement rank={me.rank} previousRank={me.previousRank} />}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  {me ? `of ${board.totalRanked} · ${me.score} pts` : 'Log a session to get ranked'}
                </Typography>
              </>
            )}
          </Box>

          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5, minHeight: 0 }}>
            {podium.length ? podium.map(row => (
              <Box key={row.userId} sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                <RankBadge rank={row.rank} size={20} />
                <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0, fontWeight: row.userId === me?.userId ? 700 : 500 }}>
                  {row.name}{row.userId === me?.userId && ' (You)'}
                </Typography>
                <Typography variant="body2" fontWeight={700}>{row.score}</Typography>
              </Box>
            )) : (
              <Typography variant="body2" color="text.secondary">No sessions logged in {periodLabel} yet.</Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="caption" color="text.secondary">{periodLabel}</Typography>
            <Button size="small" onClick={() => setOpen(true)} sx={{ textTransform: 'none', minWidth: 0, p: 0 }}>View all</Button>
          </Box>
        </>
      )}
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <EmojiEvents sx={{ mr: 1, color: MEDAL_COLORS[1] }} /> Trainer Leaderboard · {periodLabel}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            1 point per institute session logged + 1 per school activity marked Done.
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {board?.top.length ? <LeaderboardTable board={board} /> : (
            <Typography color="text.secondary">No sessions have been logged this month yet.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => reload()} disabled={loading}>Refresh</Button>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
