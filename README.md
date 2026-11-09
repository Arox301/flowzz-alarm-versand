# Flowzz notification delivery

Small public delivery module for a privately configured personal alert.

- The private cloud service performs scheduled checks and reserves each message durably before delivery.
- This workflow runs only when explicitly dispatched. It does not depend on an inactive scheduled GitHub workflow.
- Only standard public GitHub-hosted runners are used. The job refuses to run in a private repository.
- Configuration is provided exclusively through Actions secrets. Never commit topics, subscription URLs, access keys, product watchlists or personal settings.
- Confirmed rate rejections respect the publisher's retry interval. Ambiguous deliveries are never retried automatically.
- No purchase, paid subscription or paid runner is configured by this module.

The public repository contains generic delivery code only. It does not provide access to the private dashboard or its settings.
