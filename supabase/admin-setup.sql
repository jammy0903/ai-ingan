-- =============================================================================
--  AI인간(aingan) — 어드민 권한 셋업 SQL
--  실행 위치: Supabase 대시보드 → SQL Editor (역할: service_role/postgres)
--  목적: 코드 하드코딩/.env 없이, 어드민 명단을 'DB 행'으로 관리 + RLS로 서버에서 강제.
--
--  ▸ 클라이언트의 isAdmin은 화면 토글용일 뿐, 실제 차단은 여기 RLS가 한다.
--  ▸ 어드민 DB 호출은 반드시 supabase-js(sb)로 → 유저 JWT가 붙어 auth.uid()가 동작.
--    (게임의 supaSave/supaLoad는 anon 키 raw fetch라 auth.uid()=null → 어드민 판별 불가)
--
--  실행 순서: [A] 먼저 통째로 실행 → [B]에서 무야호 계정 admin 등록 →
--            [C] saves 권한은 진단(D) 보고 신중히.
-- =============================================================================


-- =============================================================================
-- [A] 어드민 명단 테이블 + 판별 함수  (안전 · 추가형 — 기존 동작에 영향 없음)
-- =============================================================================

-- 1) 어드민 명단. auth.users는 관리형이라 컬럼 추가 대신 옆 테이블로 둔다.
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  note       text,                         -- 메모(예: '무야호')
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- 2) 본인이 admin인지 '읽기'만 허용 (클라 UI 토글용).
--    INSERT/DELETE 정책은 일부러 없음 → 일반/anon은 명단 변경 불가. 추가는 대시보드(service_role)에서만.
drop policy if exists "admins_read_own" on public.admins;
create policy "admins_read_own" on public.admins
  for select to authenticated
  using (auth.uid() = user_id);

-- 3) admin 판별 헬퍼. SECURITY DEFINER로 admins를 조회(RLS 우회)하되, 반환은 boolean만.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.admins where user_id = auth.uid()
  );
$$;

-- 함수 실행 권한: 로그인 유저만(=JWT). anon에는 불필요.
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;


-- =============================================================================
-- [B] 무야호 계정을 어드민으로 등록  ← 이메일만 바꿔서 실행
-- =============================================================================
--  ▸ 아래 '무야호이메일@example.com'을 실제 로그인 이메일로 교체.
--  ▸ 이메일을 모르면 대시보드 Authentication → Users에서 UUID 복사해 두 번째 방법 사용.

-- 방법 1) 이메일로 등록
insert into public.admins (user_id, note)
select id, '무야호'
from auth.users
where email = '무야호이메일@example.com'
on conflict (user_id) do nothing;

-- 방법 2) UUID 직접 (이메일 모를 때) — 위 방법 1 대신 사용
-- insert into public.admins (user_id, note)
-- values ('00000000-0000-0000-0000-000000000000', '무야호')
-- on conflict (user_id) do nothing;


-- =============================================================================
-- [C] 보호 테이블 RLS — 어드민에게 '남의 데이터' 접근 부여
--      ⚠️ saves는 현재 anon 키로 접근 중이라, 켜는 방식이 중요. 먼저 [D] 진단부터!
-- =============================================================================
--
--  RLS 동작 규칙: RLS가 'OFF'면 정책은 무시된다(= 켜야 정책이 산다).
--  그런데 saves에 RLS를 새로 켜면, 기존 anon 세이브(저장/불러오기)가 정책 없이는 막힌다.
--  그래서 RLS를 켤 거면 (1) 기존 anon 동작 보존 정책 + (2) 어드민 정책을 '함께' 넣어야 한다.
--
--  ※ 아래는 '기존 보안수준 유지 + 어드민 전체접근 추가' 템플릿이다.
--    (현재 모델은 device_id만 알면 접근 가능한 수준 — 이를 더 조이는 건 별도 작업)
--
--  ▼▼▼ [D] 진단에서 'RLS 비활성'이고 어드민 saves 접근이 필요할 때만 주석 해제해서 실행 ▼▼▼

-- alter table public.saves enable row level security;

-- (1) 기존 동작 보존: anon/로그인 유저가 지금처럼 읽고/upsert 하게 둠
-- drop policy if exists "saves_keep_select" on public.saves;
-- create policy "saves_keep_select" on public.saves
--   for select to anon, authenticated using (true);
-- drop policy if exists "saves_keep_insert" on public.saves;
-- create policy "saves_keep_insert" on public.saves
--   for insert to anon, authenticated with check (true);
-- drop policy if exists "saves_keep_update" on public.saves;
-- create policy "saves_keep_update" on public.saves
--   for update to anon, authenticated using (true) with check (true);

-- (2) 어드민 전용: 삭제는 admin만 (남의 세이브 삭제 등 파괴적 작업은 여기로 게이트)
-- drop policy if exists "saves_admin_delete" on public.saves;
-- create policy "saves_admin_delete" on public.saves
--   for delete to authenticated using (public.is_admin());

--  ▲▲▲ 여기까지 ▲▲▲
--
--  참고: RLS가 이미 'ON'이고 anon 정책이 있는 상태라면, 위 (1)은 생략하고
--        (2) 어드민 정책(select/delete 등)만 추가하면 된다.


-- =============================================================================
-- [D] 진단 / 검증 쿼리  (읽기 전용 — 아무 때나 돌려봐도 안전)
-- =============================================================================

-- 1) 등록된 어드민 목록 확인
-- select a.user_id, u.email, a.note, a.created_at
-- from public.admins a join auth.users u on u.id = a.user_id;

-- 2) saves 테이블 RLS 켜짐 여부 ('relrowsecurity' = true면 ON)
-- select relname, relrowsecurity
-- from pg_class where relname = 'saves';

-- 3) saves에 걸린 정책 목록
-- select policyname, cmd, roles, qual, with_check
-- from pg_policies where schemaname = 'public' and tablename = 'saves';

-- ※ 주의: SQL Editor에서 select public.is_admin() 을 돌리면 보통 false가 나온다.
--   (에디터는 service_role이라 auth.uid()가 null). 실제 검증은 게임에 로그인해서
--   🛠 ADMIN 버튼이 뜨는지 + 패널의 '① 권한 재확인'으로 한다.
