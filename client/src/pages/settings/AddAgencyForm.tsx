import { useState } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import type { Agency } from '@/api';

interface AddAgencyFormProps {
  /** Reject an id that is already configured; the form then keeps its values. */
  isDuplicate: (id: number) => boolean;
  onAdd: (agency: Agency) => void;
}

const AddAgencyForm = ({ isDuplicate, onAdd }: AddAgencyFormProps) => {
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [site, setSite] = useState('');

  const handleAdd = () => {
    const numericId = Number(id);
    if (!name.trim() || !numericId || !site.trim()) return;
    if (isDuplicate(numericId)) return;
    onAdd({ id: numericId, site: site.trim(), name: name.trim() });
    setName('');
    setId('');
    setSite('');
  };

  return (
    <>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
        Add Agency
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <TextField
          label="Company Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          size="small"
          sx={{ flex: '1 1 160px' }}
        />
        <TextField
          label="Company ID"
          value={id}
          onChange={(e) => setId(e.target.value)}
          size="small"
          type="number"
          sx={{ flex: '0 0 100px' }}
        />
        <TextField
          label="Datto Site UID"
          value={site}
          onChange={(e) => setSite(e.target.value)}
          size="small"
          sx={{ flex: '1 1 200px' }}
        />
        <Button variant="contained" size="small" onClick={handleAdd} sx={{ alignSelf: 'center' }}>
          Add
        </Button>
      </Box>
    </>
  );
};

export default AddAgencyForm;
