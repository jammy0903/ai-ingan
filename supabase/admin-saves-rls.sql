-- =============================================================================
--  AI인간 — 관리자 콘솔 '유저 세이브 개별 초기화' 용 RLS
--  실행: Supabase 대시보드 → SQL Editor
--  전제: admin-setup.sql([A])로 admins 테이블 + is_admin() 함수가 이미 있어야 함.
--
--  ▸ 관리자 콘솔의 '걸음0'(update) / '초기화'(delete) 버튼은 sb(유저 JWT)로 호출 →
--    RLS에서 is_admin()이 동작해야 남의 세이브를 건드릴 수 있다.
--  ▸ 먼저 콘솔 버튼을 그냥 눌러보고, "RLS ..." 오류가 날 때만 이걸 실행하면 된다.
--    (saves에 RLS가 꺼져 있으면 authenticated 권한으로 이미 동작할 수도 있음)
-- =============================================================================

-- [0] 현재 상태 진단 (읽기 전용)
select relname, relrowsecurity as rls_on from pg_class where relname='saves';
select policyname, cmd, roles from pg_policies where schemaname='public' and tablename='saves';

-- [1] RLS 켜기 (이미 켜져 있어도 무해)
alter table public.saves enable row level security;

-- [2] 기존 동작 보존 — anon/로그인 유저가 지금처럼 읽고/생성/수정 (게임 세이브 경로 유지)
--     ⚠️ 현재 모델은 device_id 기반(진짜 소유권 검증 없음)이라 select/update는 using(true).
drop policy if exists "saves_rw" on public.saves;
create policy "saves_rw" on public.saves
  for select to anon, authenticated using (true);
drop policy if exists "saves_ins" on public.saves;
create policy "saves_ins" on public.saves
  for insert to anon, authenticated with check (true);
drop policy if exists "saves_upd" on public.saves;
create policy "saves_upd" on public.saves
  for update to anon, authenticated using (true) with check (true);

-- [3] 삭제(=완전 초기화)는 어드민만 — '초기화' 버튼 게이트
drop policy if exists "saves_admin_del" on public.saves;
create policy "saves_admin_del" on public.saves
  for delete to authenticated using (public.is_admin());

-- [4] 검증: 정책 목록
select policyname, cmd, roles from pg_policies where schemaname='public' and tablename='saves';
