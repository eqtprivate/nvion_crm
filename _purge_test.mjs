import { createClient } from '@base44/sdk';
const c = createClient({ appId: process.env.VITE_BASE44_APP_ID, requiresAuth: false });
try {
  const r = await c.entities.Contact.delete('000000000000000000000000');
  console.log('DELETE_OK', JSON.stringify(r));
} catch (e) {
  console.log('DELETE_ERR', 'status=', e?.response?.status, 'msg=', e?.message);
}
