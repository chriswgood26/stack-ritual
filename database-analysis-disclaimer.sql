-- AI Stack Analysis: records when (and which version of) the safety disclaimer
-- the user accepted. Required gate on POST /api/analysis/run.

alter table user_profiles
  add column if not exists analysis_disclaimer_accepted_at timestamptz,
  add column if not exists analysis_disclaimer_version int;
