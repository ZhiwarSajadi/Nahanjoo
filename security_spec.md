# Security Spec

Invariants:
1. `userId` must match `request.auth.uid`.
2. `timestamp` must match `request.time`.
3. `eventType` must be `LOGIN` or `ANALYSIS`.

Dirty Dozen Payloads:
1. Create a log with no auth
2. Create log with `userId` of another user
3. Create log pretending `timestamp` is from yesterday
4. Create log with invalid `eventType` 'HACK'
5. Update an existing log (forbidden)
6. Delete an existing log (forbidden)
7. Query for list but `userId != request.auth.uid`
8. Missing `userId`
9. Missing `eventType`
10. Missing `timestamp`
11. Extra ghost field `isAdmin: true`
12. `details` field is 2MB long

We will enforce size constraints and validation on create.
Update and Delete are denied.
