-- =============================================================================
--  AI인간(aingan) — 전체 유저 '걸음(walks)' 리셋
--  실행 위치: Supabase 대시보드 → SQL Editor (역할: service_role/postgres → RLS 무시)
--  ⚠️ 되돌릴 수 없음. 모든 플레이어의 walks가 0이 된다. (레벨·발견·이름 등 나머지 진행은 보존)
--
--  세이브 구조: public.saves (device_id text, data jsonb, updated_at)
--               data 안에 전체 상태가 JSON으로 들어있고, 걸음은 data->>'walks'.
-- =============================================================================

-- [1] 먼저 영향 범위 미리보기 (읽기 전용)
select count(*) as 총_세이브수,
       count(*) filter (where (data->>'walks')::numeric > 0) as walks_0초과_세이브수
from public.saves;

-- [2] 전체 유저 걸음 0으로  ← 이 한 덩어리가 실제 리셋
update public.saves
set data = jsonb_set(data, '{walks}', '0'::jsonb),
    updated_at = now()
where data ? 'walks';

-- [3] (선택) 오프라인 걸음 재적립 방지 — 마지막 접속 시각 t를 현재로.
--     안 하면 복귀 시 오프라인 적립(최대 1280걸음)이 살짝 붙는다. 완전 0 유지하려면 주석 해제.
-- update public.saves
-- set data = jsonb_set(data, '{t}', to_jsonb((extract(epoch from now())*1000)::bigint));

-- [4] 검증: walks가 0으로 바뀌었는지
select device_id, data->>'walks' as walks, updated_at
from public.saves
order by updated_at desc
limit 20;

-- ※ 만약 [2]에서 "function jsonb_set ... does not exist" 류 오류가 나면 data 컬럼이 json(텍스트)일 수 있다.
--   그때는: update public.saves set data = (jsonb_set(data::jsonb, '{walks}', '0') )::json where (data::jsonb) ? 'walks';
