-- Fix Learning Insights Trigger to Include user_id
-- Purpose: Update the trigger function to properly handle user_id in learning_insights INSERT
-- Issue: NULL constraint violation when editing drafts because INSERT doesn't include user_id
-- Created: 2025-10-02

-- Drop and recreate the trigger function with proper user_id handling
CREATE OR REPLACE FUNCTION update_learning_insights_with_stability()
RETURNS TRIGGER AS $$
DECLARE
  existing_insight RECORD;
  stability_data RECORD;
BEGIN
  -- Validate that user_id exists on the NEW record
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'user_id cannot be NULL in edit_analyses';
  END IF;

  -- Check if we already have this insight for this user
  SELECT * INTO existing_insight
  FROM learning_insights
  WHERE pattern_type = 'edit_type'
    AND pattern_value = NEW.edit_type
    AND user_id = NEW.user_id;

  -- Insert or update the learning insight WITH user_id
  INSERT INTO learning_insights (
      pattern_type, pattern_value, frequency, success_rate, recommendation, confidence,
      sample_size, time_span_days, first_occurrence, threshold_met, user_id
  )
  VALUES (
      'edit_type', NEW.edit_type, 1, NEW.success_score,
      CASE
          WHEN NEW.success_score >= 75 THEN 'Current approach working well'
          WHEN NEW.success_score >= 50 THEN 'Minor adjustments needed'
          ELSE 'Significant improvements required'
      END,
      50, 1, 1, CURRENT_TIMESTAMP, FALSE, NEW.user_id
  )
  ON CONFLICT (user_id, pattern_type, pattern_value)
  DO UPDATE SET
      frequency = GREATEST(learning_insights.frequency + 1, 1),
      success_rate = CASE
          WHEN learning_insights.frequency > 0 THEN
              (learning_insights.success_rate * learning_insights.frequency + NEW.success_score) / (learning_insights.frequency + 1)
          ELSE NEW.success_score
      END,
      confidence = LEAST(90, learning_insights.confidence + 2),
      sample_size = learning_insights.frequency + 1,
      time_span_days = GREATEST(1, EXTRACT(DAY FROM (CURRENT_TIMESTAMP - learning_insights.first_occurrence))),
      threshold_met = (
          (learning_insights.frequency + 1) >= 5 AND
          LEAST(90, learning_insights.confidence + 2) >= 65 AND
          GREATEST(1, EXTRACT(DAY FROM (CURRENT_TIMESTAMP - learning_insights.first_occurrence))) >= 3
      ),
      last_updated = CURRENT_TIMESTAMP;

  -- Now calculate stability if we have enough data (user-specific)
  SELECT * INTO stability_data
  FROM calculate_pattern_stability('edit_type', NEW.edit_type, NEW.user_id);

  -- Store stability insight if we got valid data
  IF stability_data.stability_score IS NOT NULL AND stability_data.stability_score > 0 THEN
    INSERT INTO learning_insights (
        pattern_type, pattern_value, frequency, success_rate, recommendation, confidence,
        sample_size, time_span_days, first_occurrence, threshold_met, user_id,
        metadata
    )
    VALUES (
        'stability', NEW.edit_type || '_stability',
        stability_data.sample_size, stability_data.stability_score,
        CASE
            WHEN stability_data.stability_score >= 80 THEN 'Very stable pattern - high confidence'
            WHEN stability_data.stability_score >= 60 THEN 'Moderately stable pattern'
            ELSE 'Unstable pattern - needs more data'
        END,
        stability_data.confidence,
        stability_data.sample_size,
        stability_data.time_span_days,
        CURRENT_TIMESTAMP,
        stability_data.sample_size >= 10 AND stability_data.time_span_days >= 7,
        NEW.user_id,
        jsonb_build_object(
            'variance', stability_data.variance,
            'std_dev', stability_data.std_dev,
            'coefficient_of_variation', stability_data.coefficient_of_variation,
            'trend', stability_data.trend,
            'stability_score', stability_data.stability_score
        )
    )
    ON CONFLICT (user_id, pattern_type, pattern_value)
    DO UPDATE SET
        frequency = EXCLUDED.frequency,
        success_rate = EXCLUDED.success_rate,
        recommendation = EXCLUDED.recommendation,
        confidence = EXCLUDED.confidence,
        sample_size = EXCLUDED.sample_size,
        time_span_days = EXCLUDED.time_span_days,
        threshold_met = EXCLUDED.threshold_met,
        metadata = EXCLUDED.metadata,
        last_updated = CURRENT_TIMESTAMP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger exists and is properly attached
DROP TRIGGER IF EXISTS update_insights_with_stability_analysis ON edit_analyses;

CREATE TRIGGER update_insights_with_stability_analysis
AFTER INSERT ON edit_analyses
FOR EACH ROW
EXECUTE FUNCTION update_learning_insights_with_stability();

-- Log completion
DO $$
BEGIN
    RAISE NOTICE '✅ Trigger function updated to include user_id in all INSERT statements';
    RAISE NOTICE '✅ Trigger re-attached to edit_analyses table';
    RAISE NOTICE '✅ Learning insights will now properly respect user isolation';
END $$;
