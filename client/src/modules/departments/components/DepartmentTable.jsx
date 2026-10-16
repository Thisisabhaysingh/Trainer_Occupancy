import { IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip } from '@mui/material';
import { DeleteOutline, EditOutlined } from '@mui/icons-material';
import EmptyState from '../../../components/states/EmptyState';

const DepartmentTable = ({ departments, canManage, onEdit, onDelete }) => {
  if (!departments.length) return <EmptyState title="No departments found" description="Create the first department to get started." />;
  return (
    <TableContainer>
      <Table aria-label="Departments">
        <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Location</TableCell><TableCell>Description</TableCell>{canManage && <TableCell align="right">Actions</TableCell>}</TableRow></TableHead>
        <TableBody>
          {departments.map((department) => (
            <TableRow key={department.id} hover>
              <TableCell sx={{ fontWeight: 700 }}>{department.name}</TableCell>
              <TableCell>{department.location}</TableCell>
              <TableCell>{department.description || '—'}</TableCell>
              {canManage && <TableCell align="right">
                <Tooltip title="Edit"><IconButton onClick={() => onEdit(department)}><EditOutlined /></IconButton></Tooltip>
                <Tooltip title="Delete"><IconButton color="error" onClick={() => onDelete(department)}><DeleteOutline /></IconButton></Tooltip>
              </TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default DepartmentTable;
