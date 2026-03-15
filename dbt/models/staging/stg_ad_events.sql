-- models/staging/stg_ad_events.sql
-- Cleans and standardises raw ad events from Spark → BigQuery

{{
  config(
    materialized = 'view',
    tags = ['staging', 'ad_events']
  )
}}

with source as (
    select * from {{ source('ad_spend_raw', 'raw_ad_events') }}
),

cleaned as (
    select
        event_id,
        event_type,
        safe.parse_timestamp('%Y-%m-%dT%H:%M:%E*SZ', timestamp)  as event_ts,
        ingested_at,
        date_partition,

        -- Campaign dimensions
        campaign_id,
        campaign_name,
        lower(trim(platform))   as platform,
        lower(trim(ad_format))  as ad_format,
        upper(trim(country))    as country,
        lower(trim(device))     as device,

        -- Metrics (coalesce nulls to 0)
        coalesce(impressions, 0)  as impressions,
        coalesce(clicks, 0)       as clicks,
        coalesce(conversions, 0)  as conversions,
        coalesce(spend_usd, 0.0)  as spend_usd,
        coalesce(revenue_usd, 0.0) as revenue_usd,
        coalesce(cpm, 0.0)        as cpm,
        coalesce(cpc, 0.0)        as cpc,
        coalesce(roas, 0.0)       as roas,

        -- Partition helpers
        date(safe.parse_timestamp('%Y-%m-%dT%H:%M:%E*SZ', timestamp)) as event_date,
        extract(hour from safe.parse_timestamp('%Y-%m-%dT%H:%M:%E*SZ', timestamp)) as event_hour

    from source
    where event_id is not null
      and event_type in ('impression', 'click', 'conversion')
      and platform is not null
      -- Remove duplicate events within 1-second window
      qualify row_number() over (
          partition by event_id
          order by ingested_at desc
      ) = 1
)

select * from cleaned
