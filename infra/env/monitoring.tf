/* ===========================================================================
   Telling you when the backup stopped working.

   backup.sh exits non-zero on failure, which is correct and insufficient:
   cron's non-zero exit goes to a mail spool nobody reads. The script pushes
   a metric instead, and this watches it.

   TREAT MISSING DATA AS BREACHING. That is the setting that matters. A
   failed backup pushes 0 and trips the alarm; a cron that never ran pushes
   nothing at all — and with the default `missing` behaviour the alarm would
   sit in INSUFFICIENT_DATA looking calm while no backup had been taken for
   a month. Silence is the symptom, so silence has to be the alarm.
   ========================================================================= */

resource "aws_sns_topic" "alerts" {
  name = "${local.name}-alerts"
  tags = local.tags
}

resource "aws_sns_topic_subscription" "alerts_email" {
  count = var.alert_email == "" ? 0 : 1

  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email

  # AWS emails a confirmation link; the subscription is inert until it is
  # clicked. Terraform cannot click it, so a plan showing this as created is
  # not the same as alerts being deliverable.
}

resource "aws_cloudwatch_metric_alarm" "backup" {
  alarm_name        = "${local.name}-backup-failed"
  alarm_description = "No successful database backup in the last 36 hours. backup.sh runs at 03:00 UTC; see /var/log/medicraft-backup.log on the server."

  namespace   = "MediCraft/Backups"
  metric_name = "BackupSuccess"
  dimensions  = { Environment = var.env_name }

  statistic           = "Maximum"
  comparison_operator = "LessThanThreshold"
  threshold           = 1
  # 36 hours: longer than a day, so a late run does not page anyone, and
  # short enough that two consecutive misses are caught.
  period             = 129600
  evaluation_periods = 1

  treat_missing_data = "breaching"

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = local.tags
}

output "alerts_topic" {
  value = aws_sns_topic.alerts.arn
}
