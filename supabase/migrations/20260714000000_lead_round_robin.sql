-- Presença (online/offline) + distribuição round-robin de leads entre vendedores logados.

alter table public.profiles add column if not exists last_seen_at timestamptz;
alter table public.profiles add column if not exists receive_leads boolean not null default true;
alter table public.profiles add column if not exists last_lead_assigned_at timestamptz;
alter table public.empresas add column if not exists lead_auto_distribute boolean not null default false;

-- Heartbeat de presença (RPC seguras, chamadas pelo app).
create or replace function public.touch_presence()
returns void language sql security definer set search_path = public as $$
  update public.profiles set last_seen_at = now() where id = auth.uid();
$$;

create or replace function public.clear_presence()
returns void language sql security definer set search_path = public as $$
  update public.profiles set last_seen_at = null where id = auth.uid();
$$;

grant execute on function public.touch_presence() to authenticated;
grant execute on function public.clear_presence() to authenticated;

-- Round-robin: escolhe o vendedor ONLINE elegível com atribuição mais antiga.
create or replace function public.assign_lead_round_robin()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_auto boolean;
  v_id uuid;
  v_name text;
begin
  if new.vendedor_responsavel is not null and length(trim(new.vendedor_responsavel)) > 0 then
    return new;
  end if;
  if new.empresa_id is null then
    return new;
  end if;

  select lead_auto_distribute into v_auto from public.empresas where id = new.empresa_id;
  if not coalesce(v_auto, false) then
    return new;
  end if;

  select p.id, p.display_name into v_id, v_name
  from public.profiles p
  where p.empresa_id = new.empresa_id
    and p.role = 'vendedor'
    and p.status = 'ativo'
    and coalesce(p.receive_leads, true) = true
    and p.last_seen_at is not null
    and p.last_seen_at > now() - interval '3 minutes'
  order by p.last_lead_assigned_at asc nulls first, p.last_seen_at asc
  limit 1;

  if v_id is null then
    return new;
  end if;

  new.vendedor_responsavel := v_name;
  update public.profiles set last_lead_assigned_at = now() where id = v_id;

  if new.lider_vinculado is null then
    select v.lider into new.lider_vinculado
    from public.vendedores v
    where v.empresa_id = new.empresa_id and v.nome = v_name
    limit 1;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_assign_lead_round_robin on public.leads;
create trigger trg_assign_lead_round_robin
before insert on public.leads
for each row execute function public.assign_lead_round_robin();
