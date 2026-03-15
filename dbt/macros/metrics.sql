{% macro safe_ratio(numerator, denominator, default=0.0) %}
    case
        when {{ denominator }} is null or {{ denominator }} = 0 then {{ default }}
        else {{ numerator }} / {{ denominator }}
    end
{% endmacro %}

{% macro pct_change(current, previous) %}
    case
        when {{ previous }} is null or {{ previous }} = 0 then null
        else round(({{ current }} - {{ previous }}) / {{ previous }} * 100, 2)
    end
{% endmacro %}
