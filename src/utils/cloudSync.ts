import { Transaction, CategoryBudget, FinancialGoal } from '../types';

export function getSupabaseTableSchemaSQL(): string {
  return `-- Copie e cole este script no Editor SQL do seu projeto no Supabase:
-- https://supabase.com/dashboard/project/_/sql

create table if not exists public.financas_data (
  id text primary key default 'user_data',
  transactions jsonb not null default '[]'::jsonb,
  budgets jsonb not null default '[]'::jsonb,
  goals jsonb not null default '[]'::jsonb,
  updated_at timestamptz default timezone('utc'::text, now())
);

-- Habilitar RLS (Row Level Security) e permitir leitura/gravação anônima simplificada
alter table public.financas_data enable row level security;

create policy "Permitir tudo na financas_data"
on public.financas_data
for all
to anon
using (true)
with check (true);
`;
}

export async function testSupabaseConnection(
  supabaseUrl: string,
  supabaseKey: string
): Promise<{ success: boolean; message: string }> {
  try {
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const endpoint = `${cleanUrl}/rest/v1/financas_data?select=id&limit=1`;

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    if (res.ok) {
      return { success: true, message: 'Conexão com o Supabase estabelecida com sucesso!' };
    } else {
      const text = await res.text();
      if (res.status === 404 || text.includes('relation "public.financas_data" does not exist')) {
        return {
          success: false,
          message: 'Tabela não encontrada. Por favor, execute o script SQL fornecido no editor do Supabase.',
        };
      }
      return { success: false, message: `Erro ao conectar (${res.status}): ${text}` };
    }
  } catch (err: any) {
    return { success: false, message: `Falha de rede ou URL inválida: ${err.message || err}` };
  }
}

export async function pushToSupabase(
  supabaseUrl: string,
  supabaseKey: string,
  data: {
    transactions: Transaction[];
    budgets: CategoryBudget[];
    goals: FinancialGoal[];
  }
): Promise<{ success: boolean; message: string }> {
  try {
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const endpoint = `${cleanUrl}/rest/v1/financas_data`;

    const payload = {
      id: 'user_data',
      transactions: data.transactions,
      budgets: data.budgets,
      goals: data.goals,
      updated_at: new Date().toISOString(),
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      return { success: true, message: 'Dados sincronizados com a nuvem com sucesso!' };
    } else {
      const errText = await res.text();
      return { success: false, message: `Erro ao enviar dados (${res.status}): ${errText}` };
    }
  } catch (err: any) {
    return { success: false, message: `Falha ao sincronizar: ${err.message || err}` };
  }
}

export async function pullFromSupabase(
  supabaseUrl: string,
  supabaseKey: string
): Promise<{
  success: boolean;
  data?: {
    transactions: Transaction[];
    budgets: CategoryBudget[];
    goals: FinancialGoal[];
  };
  message: string;
}> {
  try {
    const cleanUrl = supabaseUrl.replace(/\/+$/, '');
    const endpoint = `${cleanUrl}/rest/v1/financas_data?select=*&id=eq.user_data`;

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, message: `Erro ao buscar dados (${res.status}): ${errText}` };
    }

    const json = await res.json();
    if (Array.isArray(json) && json.length > 0) {
      const record = json[0];
      return {
        success: true,
        data: {
          transactions: Array.isArray(record.transactions) ? record.transactions : [],
          budgets: Array.isArray(record.budgets) ? record.budgets : [],
          goals: Array.isArray(record.goals) ? record.goals : [],
        },
        message: 'Dados carregados da nuvem com sucesso!',
      };
    } else {
      return { success: true, message: 'Nenhum dado encontrado na nuvem ainda.' };
    }
  } catch (err: any) {
    return { success: false, message: `Falha ao carregar da nuvem: ${err.message || err}` };
  }
}
