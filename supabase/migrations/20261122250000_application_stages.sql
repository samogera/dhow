-- Members track where they are: interested, started, or submitted.
alter type application_status add value if not exists 'interested' before 'draft';
alter type application_status add value if not exists 'started' before 'submitted';
