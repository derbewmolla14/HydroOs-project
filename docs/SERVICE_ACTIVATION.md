# HydroOS Service Activation & Subscription Management

## Service types

- `water_tank`
- `irrigation`
- `soil_moisture`
- `water_source`
- `water_quality`

## Subscription rules

- New operator accounts start with an inactive, unpaid `individual` subscription and no allowed services.
- `individual` permits one service type at a time.
- `all` permits all five service types unless the Super Admin explicitly revokes a module by removing it from `allowedServices`.
- An operator must have `subscriptionStatus: active`, `monthlyFeePaid: true`, and a future `subscriptionExpiresAt` to access paid modules.
- When the Super Admin confirms payment without setting an expiry date, the API sets a 30-day expiry. Payment confirmation is an administrative action; no payment gateway is connected by this feature.
- Platform administrators retain administrative access. Operator access is checked in the API as well as the React routes and sidebar.

## Super Admin UI

Open **Service Activation** in the existing sidebar. The page supports:

1. Creating a unique Service ID and selecting its module.
2. Generating a strong service password or supplying a custom password of at least 12 characters.
3. Assigning or unassigning a service to a user.
4. Activating/deactivating a service credential.
5. Rotating a service password.
6. Updating a user's plan, subscription status, monthly payment flag, expiry date, and allowed modules.

Service passwords are bcrypt-hashed in MongoDB. A password is returned only when the credential is created or rotated; save it securely because it cannot be retrieved later.

## Operator UI

Open **My Services** from the existing sidebar. Operators can enter the Service ID and password provided by the Super Admin. A successful link assigns the service to that operator and refreshes the authenticated profile so the sidebar updates immediately.

## API endpoints

All endpoints use the existing authenticated HttpOnly-cookie session.

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/v1/services/me` | Authenticated |
| POST | `/api/v1/services/link` | Operator |
| GET | `/api/v1/services/admin/devices` | Super Admin |
| POST | `/api/v1/services/admin/devices` | Super Admin |
| PATCH | `/api/v1/services/admin/devices/:id` | Super Admin |
| POST | `/api/v1/services/admin/devices/:id/rotate-password` | Super Admin |
| GET | `/api/v1/services/admin/users` | Super Admin |
| PATCH | `/api/v1/services/admin/users/:userId/subscription` | Super Admin |

## Hardware telemetry

IoT Device records now include a `serviceType`. Set this when registering a device so monitoring queries can scope telemetry to the operator's permitted modules. Legacy devices without this field are treated as water-tank devices. The service credential record controls a user's entitlement; the existing Device credential continues to authenticate hardware ingestion.

## Deployment notes

No new environment variables are required. Deploy the backend and frontend together so the new API routes, user profile fields, and subscription-aware navigation are available at the same time. Existing users default to an inactive subscription until a Super Admin activates them.
