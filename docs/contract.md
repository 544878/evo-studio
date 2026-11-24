# Local runtime contract

The owner operates the CLI on one computer. SQLite serializes commands. Every ticket references existing dependencies, one writer scope and one role. A review binds an immutable artifact digest to the current ticket revision. Work and companion context use separate projections. Public drafts accept explicitly selected text. Approval binds the destination and exact draft. External model adapters run in a trusted host process. The local command line assumes the operating system user is the owner.

SQLite provides the transaction boundary for admission, revision checks and journal append. The worker executes outside that transaction. It can submit only while its captured version remains current. The filesystem outbox installs immutable bytes before the receipt transaction commits. A retry can recognize a file already installed. Crashes can leave unreferenced temporary files. External delivery adapters must provide their own idempotency contract.
