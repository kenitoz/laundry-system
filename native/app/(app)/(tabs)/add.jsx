import { useRef, useState } from 'react';

import { api } from '../../../src/api';
import SaveAnimation from '../../../src/components/SaveAnimation';
import { Button, Card, Field, H2, Label, Notice, Page } from '../../../src/components/ui';
import { fmtDate } from '../../../src/format';
import { useSession } from '../../../src/session';
import { parseAmount, validateTransaction } from '../../../src/validation';

const EMPTY = { name: '', total: '', paid: '' };

export default function AddCustomer() {
  const { selectedDate } = useSession();
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState({ ok: true, text: '' });
  const [saving, setSaving] = useState('');
  const busy = useRef(false);

  const set = (key) => (value) => { setForm((f) => ({ ...f, [key]: value })); setMsg({ ok: true, text: '' }); };

  async function save() {
    if (busy.current || saving) return;
    const problem = validateTransaction(form);
    if (problem) return setMsg({ ok: false, text: problem });
    busy.current = true;
    const name = form.name.trim();
    try {
      await api('/transactions', {
        method: 'POST',
        body: { customer_name: name, total_amount: parseAmount(form.total), amount_paid: parseAmount(form.paid), transaction_date: selectedDate },
      });
      setForm(EMPTY);
      setSaving(name.toUpperCase());
    } catch (x) {
      setMsg({ ok: false, text: x.message });
    } finally {
      busy.current = false;
    }
    return undefined;
  }

  return (
    <Page>
      <Card style={{ borderRadius: 14 }}>
        <H2>Transaction details</H2>
        <Label>Customer name</Label>
        <Field accessibilityLabel="Customer name" value={form.name} onChangeText={set('name')} placeholder="e.g. Juan Dela Cruz" autoCapitalize="words" />
        <Label>Total amount</Label>
        <Field accessibilityLabel="Total amount" value={form.total} onChangeText={set('total')} keyboardType="decimal-pad" />
        <Label>Amount paid</Label>
        <Field accessibilityLabel="Amount paid" value={form.paid} onChangeText={set('paid')} keyboardType="decimal-pad" />
        <Label>Transaction date</Label>
        <Field accessibilityLabel="Transaction date" value={selectedDate ? fmtDate(selectedDate, 'long') : ''} editable={false} />
        <Button title="✓ Add Customer" onPress={() => { save(); }} disabled={!!saving} style={{ marginTop: 32, marginBottom: 12 }} />
        <Notice ok={msg.ok} text={msg.text} />
      </Card>
      <SaveAnimation
        visible={!!saving}
        name={saving}
        onDone={() => { setSaving(''); setMsg({ ok: true, text: 'Transaction saved to the selected date.' }); }}
      />
    </Page>
  );
}
