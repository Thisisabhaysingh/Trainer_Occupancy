import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
    Alert,
    CircularProgress,
    Stack,
    Chip
} from '@mui/material';
import { AccessTime as TimeIcon } from '@mui/icons-material';
import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

const getTaskTimeEntries = (task) => {
    if (Array.isArray(task?.timeEntries)) return task.timeEntries;
    if (typeof task?.timeEntries === 'string') {
        try {
            const parsed = JSON.parse(task.timeEntries);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
};

const isTaskMarkedComplete = (task) => Boolean(task?.completedAt);

const isTaskSubmittedOrClosed = (task) =>
    ['submitted', 'completed', 'approved'].includes(task?.status);

const TaskTimeLogger = ({ open, onClose, task, onSuccess, showSnackbar }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [timeData, setTimeData] = useState({
        startTime: '',
        endTime: '',
        notes: '',
        duration: ''
    });
    const hasLoggedTime = getTaskTimeEntries(task).length > 0 || Number(task?.actual_hours_new || task?.actual_hours || 0) > 0;
    const markedComplete = isTaskMarkedComplete(task);
    const submittedOrClosed = isTaskSubmittedOrClosed(task);
    const canLogTime = !markedComplete && !submittedOrClosed;
    const canMarkComplete = hasLoggedTime && !markedComplete && !submittedOrClosed;

    const calculateDuration = (start, end) => {
        if (!start || !end) return 0;
        const startDate = new Date(`2000/01/01 ${start}`);
        const endDate = new Date(`2000/01/01 ${end}`);
        const diffMs = endDate - startDate;
        const diffMins = Math.round(diffMs / 60000);
        return diffMins > 0 ? diffMins : 0;
    };

    const handleStartTimeChange = (value) => {
        setTimeData({ ...timeData, startTime: value });
        if (timeData.endTime) {
            const duration = calculateDuration(value, timeData.endTime);
            setTimeData({ ...timeData, startTime: value, duration: duration });
        }
    };

    const handleEndTimeChange = (value) => {
        setTimeData({ ...timeData, endTime: value });
        if (timeData.startTime) {
            const duration = calculateDuration(timeData.startTime, value);
            setTimeData({ ...timeData, endTime: value, duration: duration });
        }
    };

    const handleSubmit = async () => {
        if (!canLogTime) {
            setError('This task is already marked complete or submitted for review. Time cannot be logged now.');
            return;
        }

        if (!timeData.startTime || !timeData.endTime) {
            setError('Please enter both start and end time');
            return;
        }

        if (timeData.duration <= 0) {
            setError('End time must be after start time');
            return;
        }

        setLoading(true);
        setError('');
        
        try {
            const response = await axios.post(`${apiBaseUrl}/api/employee/tasks/${task.id}/log-time`, {
                startTime: timeData.startTime,
                endTime: timeData.endTime,
                duration: timeData.duration,
                notes: timeData.notes
            }, { withCredentials: true });
            
            if (response.data.success) {
                showSnackbar('Time logged successfully!', 'success');
                if (onSuccess) onSuccess();
                onClose();
                setTimeData({ startTime: '', endTime: '', notes: '', duration: '' });
            }
        } catch (error) {
            console.error('Error logging time:', error);
            const message = error.response?.data?.code === 'ATTENDANCE_REQUIRED'
                ? error.response.data.error
                : error.response?.data?.error || 'Failed to log time';
            setError(message);
            if (showSnackbar) showSnackbar(message, 'warning');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkComplete = async () => {
        if (!hasLoggedTime) {
            setError('Please log time before marking this task complete.');
            return;
        }

        if (markedComplete || submittedOrClosed) {
            setError('This task is already marked complete or submitted for review.');
            return;
        }

        setLoading(true);
        try {
            const response = await axios.put(`${apiBaseUrl}/api/employee/tasks/${task.id}/complete`, {
                completion_notes: timeData.notes || 'Task completed'
            }, { withCredentials: true });
            
            if (response.data.success) {
                showSnackbar('Task marked complete. Progress is now 80%.', 'success');
                if (onSuccess) onSuccess();
                onClose();
            }
        } catch (error) {
            console.error('Error completing task:', error);
            const message = error.response?.data?.error || 'Failed to complete task';
            setError(message);
            if (showSnackbar) showSnackbar(message, 'warning');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Box display="flex" alignItems="center" gap={1}>
                    <TimeIcon color="primary" />
                    <Typography variant="h6">Log Time - {task?.title}</Typography>
                </Box>
            </DialogTitle>
            <DialogContent>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {(markedComplete || submittedOrClosed) && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        This task is already marked complete or submitted for review. Time logging is closed.
                    </Alert>
                )}
                {canLogTime && !hasLoggedTime && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        Log time first. Mark Complete will be available after at least one time entry is saved.
                    </Alert>
                )}
                
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <Typography variant="body2" color="textSecondary">
                        Project: {task?.project?.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Due Date: {task?.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set'}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            fullWidth
                            label="Start Time"
                            type="time"
                        value={timeData.startTime}
                        onChange={(e) => handleStartTimeChange(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        disabled={!canLogTime || loading}
                    />
                    <TextField
                            fullWidth
                            label="End Time"
                            type="time"
                        value={timeData.endTime}
                        onChange={(e) => handleEndTimeChange(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        disabled={!canLogTime || loading}
                    />
                    </Box>
                    
                    {timeData.duration > 0 && (
                        <Alert severity="info" icon={<TimeIcon />}>
                            Duration: {(timeData.duration / 60).toFixed(2)} hours ({timeData.duration} minutes)
                        </Alert>
                    )}
                    
                    <TextField
                        fullWidth
                        label="Notes / Comments"
                        multiline
                        rows={3}
                        value={timeData.notes}
                        onChange={(e) => setTimeData({ ...timeData, notes: e.target.value })}
                        placeholder="Add any notes about the work done..."
                        disabled={!canLogTime || loading}
                    />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
                <Button onClick={onClose}>Cancel</Button>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button 
                        variant="outlined" 
                        color="success"
                        onClick={handleMarkComplete}
                        disabled={loading || !canMarkComplete}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Mark Complete'}
                    </Button>
                    <Button 
                        variant="contained" 
                        onClick={handleSubmit}
                        disabled={loading || !canLogTime}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Log Time'}
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
    );
};

export default TaskTimeLogger;
