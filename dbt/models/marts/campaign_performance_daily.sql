-- models/marts/core/campaign_performance_daily.sql
-- Daily campaign performance rollup with ROAS, CTR, CVR metrics

{{
  config(
    materialized = 'table',
    partition_by = {
      'field': 'event_date',
      'data_type': 'date',
      'granularity': 'day'
    },
    cluster_by = ['platform', 'campaign_id'],
    tags = ['mart', 'campaign', 'daily']
  )
}}

with events as (
    select * from {{ ref('stg_ad_events') }}
    where event_date >= date_sub(current_date(), interval {{ var('lookback_days') }} day)
),

daily_rollup as (
    select
        event_date,
        platform,
        campaign_id,
        campaign_name,
        country,
        device,
        ad_format,

        -- Volume metrics
        sum(impressions)  as total_impressions,
        sum(clicks)       as total_clicks,
        sum(conversions)  as total_conversions,

        -- Spend & revenue
        round(sum(spend_usd), 2)   as total_spend_usd,
        round(sum(revenue_usd), 2) as total_revenue_usd,

        -- Efficiency ratios
        round(safe_divide(sum(clicks), nullif(sum(impressions), 0)), 4)      as ctr,
        round(safe_divide(sum(conversions), nullif(sum(clicks), 0)), 4)      as cvr,
        round(safe_divide(sum(revenue_usd), nullif(sum(spend_usd), 0)), 4)   as roas,
        round(safe_divide(sum(spend_usd) * 1000, nullif(sum(impressions), 0)), 4) as cpm,
        round(safe_divide(sum(spend_usd), nullif(sum(clicks), 0)), 4)        as cpc,
        round(safe_divide(sum(spend_usd), nullif(sum(conversions), 0)), 4)   as cpa,

        -- Performance vs target
        round(safe_divide(sum(revenue_usd), nullif(sum(spend_usd), 0)), 4)
            >= {{ var('roas_target') }}  as meets_roas_target,

        count(*) as event_count,
        current_timestamp() as dbt_updated_at

    from events
    group by 1,2,3,4,5,6,7
)

select * from daily_rollup
