import { Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import EmptyState from '../../../components/states/EmptyState';

const BranchTable = ({ branches }) => {
  if (!branches.length) return <EmptyState title="No branches found" description="Create the first branch to get started." />;
  return <TableContainer><Table aria-label="Branches"><TableHead><TableRow><TableCell>Name</TableCell><TableCell>Location</TableCell><TableCell>Manager</TableCell><TableCell>Employees</TableCell></TableRow></TableHead><TableBody>
    {branches.map((branch) => <TableRow key={branch.id} hover><TableCell sx={{ fontWeight: 700 }}>{branch.name}</TableCell><TableCell>{branch.location}</TableCell><TableCell>{branch.manager?.name || 'Unassigned'}</TableCell><TableCell><Chip size="small" label={(branch.branchUsers || []).length} /></TableCell></TableRow>)}
  </TableBody></Table></TableContainer>;
};
export default BranchTable;
