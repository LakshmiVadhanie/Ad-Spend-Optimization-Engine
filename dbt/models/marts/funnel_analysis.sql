-- models/marts/funnel_analysis.sql
-- Funnel drop-off analysis: impression → click → conversion

{{
  config(
    materialized = 'table',
    partition_by = {'field': 'event_date', 'data_type': 'date'},
    cluster_by = ['platform', 'campaign_id'],
    tags = ['mart', 'funnel']
  )
}}

with stage_counts as (
    select
        event_date,
        platform,
        campaign_id,
        campaign_name,
        event_type,
        sum(
            case event_type
                when 'impression' then impressions
                when 'click'      then clicks
                when 'conversion' then conversions
                else 0
            end
        ) as stage_count

    from {{ ref('stg_ad_events') }}
    group by 1,2,3,4,5
),

pivoted as (
    select
        event_date,
        platform,
        campaign_id,
        campaign_name,

        sum(case when event_type = 'impression' then stage_count else 0 end) as impressions,
        sum(case when event_type = 'click'      then stage_count else 0 end) as clicks,
        sum(case when event_type = 'conversion' then stage_count else 0 end) as conversions

    from stage_counts
    group by 1,2,3,4
),

with_dropoff as (
    select
        *,
        round(safe_divide(clicks, nullif(impressions, 0)), 4)       as impression_to_click_rate,
        round(safe_divide(conversions, nullif(clicks, 0)), 4)        as click_to_conversion_rate,
        round(safe_divide(conversions, nullif(impressions, 0)), 6)   as overall_conversion_rate,

        -- Drop-off counts
        (impressions - clicks)      as dropped_at_impression,
        (clicks - conversions)      as dropped_at_click,

        -- Drop-off percentages
        round(safe_divide(impressions - clicks, nullif(impressions, 0)), 4) as pct_dropped_at_impression,
        round(safe_divide(clicks - conversions, nullif(clicks, 0)), 4)      as pct_dropped_at_click,

        current_timestamp() as dbt_updated_at

    from pivoted
)

select * from with_dropoff
