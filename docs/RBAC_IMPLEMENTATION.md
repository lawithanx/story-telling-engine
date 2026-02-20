# Hawkseye: Role-Based Access Control Implementation Plan

## Overview
This document outlines the implementation strategy for strict role separation and zero-trust architecture based on modern threat landscape analysis.

---

## Role Definitions

### 1. **Overwatch** (Command/Analyst)
**Purpose**: Centralized situational awareness and decision-making

**Permissions**:
- ✅ Read all telemetry feeds
- ✅ View all tactical assets
- ✅ Annotate and tag events
- ✅ Escalate threats
- ✅ Generate reports
- ❌ Modify asset configurations
- ❌ Access billing
- ❌ Manage users

**UI Components**:
- Live tactical map with all assets
- Telemetry timeline
- Threat proximity alerts
- Mission status dashboard
- Annotation tools

---

### 2. **Operator** (Field Agent)
**Purpose**: Feed data from the field with minimal friction

**Permissions**:
- ✅ Submit telemetry for assigned assets
- ✅ View own asset status
- ✅ Receive directives from Overwatch
- ✅ Update own profile
- ❌ View other operators' data
- ❌ Access command dashboard
- ❌ Modify team settings

**UI Components**:
- Simplified asset status view
- Telemetry submission interface
- Directive inbox
- Emergency alert button

---

### 3. **Admin** (Organization Owner)
**Purpose**: Manage organization, users, and billing (NO operational access)

**Permissions**:
- ✅ Manage users and roles
- ✅ Configure billing and plans
- ✅ View audit logs
- ✅ Manage integrations
- ❌ View live telemetry
- ❌ Access tactical maps
- ❌ Interfere with operations

**UI Components**:
- User management console
- Billing dashboard
- Audit log viewer
- Integration settings

---

## Implementation Phases

### Phase 1: Backend RBAC (Priority: CRITICAL)

#### 1.1 Permission System
```python
# backend/webapp/apps/operations/permissions.py

from rest_framework import permissions

class IsOverwatch(permissions.BasePermission):
    """
    Permission for command/analyst roles.
    Can read all data, annotate, escalate.
    """
    def has_permission(self, request, view):
        return request.user.profile.role == 'overwatch'

class IsOperator(permissions.BasePermission):
    """
    Permission for field agents.
    Can submit telemetry for assigned assets only.
    """
    def has_permission(self, request, view):
        return request.user.profile.role == 'operator'
    
    def has_object_permission(self, request, view, obj):
        # Operators can only access their assigned assets
        return obj.assigned_operator == request.user

class IsAdmin(permissions.BasePermission):
    """
    Permission for org admins.
    NO access to operational data.
    """
    def has_permission(self, request, view):
        return request.user.profile.role == 'admin'
```

#### 1.2 Model Updates
```python
# Add role field to Profile model
class Profile(models.Model):
    ROLE_CHOICES = [
        ('overwatch', 'Overwatch'),
        ('operator', 'Operator'),
        ('admin', 'Admin'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='operator')
    assigned_command_center = models.ForeignKey(CommandCenter, null=True, blank=True)
    
# Add operator assignment to TacticalAsset
class TacticalAsset(models.Model):
    assigned_operator = models.ForeignKey(User, null=True, blank=True)
```

#### 1.3 API View Protection
```python
# Apply permissions to all views
class TelemetryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOverwatch | IsOperator]
    
    def get_queryset(self):
        if self.request.user.profile.role == 'operator':
            # Operators only see their assigned assets
            return Telemetry.objects.filter(
                payload__modem__assigned_operator=self.request.user
            )
        # Overwatch sees everything
        return Telemetry.objects.all()
```

---

### Phase 2: Frontend Role-Based Routing

#### 2.1 Route Guards
```javascript
// frontend/src/components/RoleRoute.jsx

import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export const RoleRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" />;
  }
  
  return children;
};
```

#### 2.2 Role-Specific Layouts
```javascript
// frontend/src/layouts/OverwatchLayout.jsx
// Tactical map, full telemetry, annotation tools

// frontend/src/layouts/OperatorLayout.jsx
// Simplified view, submission interface, directives

// frontend/src/layouts/AdminLayout.jsx
// User management, billing, audit logs (NO operational data)
```

---

### Phase 3: Billing Abstraction

#### 3.1 Separate Admin Console
```
/admin-console/
  ├── /users
  ├── /billing
  ├── /audit-logs
  ├── /integrations
```

**Access**: Admin role ONLY  
**URL Pattern**: `/admin-console/*`  
**Enforcement**: Backend + frontend route guards

#### 3.2 Remove Billing from Operational Views
- Delete billing components from main dashboard
- Remove billing API calls from operational contexts
- Ensure no financial data in telemetry feeds

---

### Phase 4: Feed Compartmentalization

#### 4.1 Team-Based Isolation
```python
class Mission(models.Model):
    team_members = models.ManyToManyField(User, through='MissionMembership')
    isolation_level = models.CharField(
        choices=[('open', 'Open'), ('restricted', 'Restricted'), ('classified', 'Classified')]
    )

class MissionMembership(models.Model):
    user = models.ForeignKey(User)
    mission = models.ForeignKey(Mission)
    access_level = models.CharField(choices=[('read', 'Read'), ('write', 'Write'), ('admin', 'Admin')])
    revoked_at = models.DateTimeField(null=True, blank=True)
```

#### 4.2 Instant Revocation
```python
# WebSocket consumer checks revocation status
class TelemetryConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Check if user access is revoked
        membership = await self.get_membership()
        if membership.revoked_at:
            await self.close()
            return
        await self.accept()
```

---

## Security Checklist

### Backend
- [ ] Implement permission classes for all roles
- [ ] Add role field to Profile model
- [ ] Protect all API endpoints with role-based permissions
- [ ] Implement object-level permissions for operators
- [ ] Add audit logging for all access
- [ ] Implement instant revocation mechanism

### Frontend
- [ ] Create role-based route guards
- [ ] Build separate layouts for each role
- [ ] Remove billing from operational UI
- [ ] Implement role-specific navigation
- [ ] Add unauthorized access page

### Database
- [ ] Add migration for role field
- [ ] Add migration for operator assignments
- [ ] Add migration for mission memberships
- [ ] Create indexes for performance

### Testing
- [ ] Unit tests for permission classes
- [ ] Integration tests for role-based access
- [ ] E2E tests for each role workflow
- [ ] Security audit for privilege escalation

---

## Migration Strategy

### Step 1: Add Role Field (Non-Breaking)
```bash
python manage.py makemigrations
python manage.py migrate
```

### Step 2: Assign Roles to Existing Users
```python
# Management command to assign default roles
for user in User.objects.all():
    if user.is_staff:
        user.profile.role = 'overwatch'
    else:
        user.profile.role = 'operator'
    user.profile.save()
```

### Step 3: Enable Permission Enforcement
- Deploy backend with new permissions
- Deploy frontend with role guards
- Monitor for access denials

### Step 4: Remove Billing from Ops UI
- Create separate admin console
- Migrate billing views
- Remove from main app

---

## Success Metrics

1. **Zero privilege escalation vulnerabilities**
2. **100% API endpoint coverage with role checks**
3. **Sub-100ms revocation latency**
4. **Clear UI separation by role**
5. **No billing data in operational contexts**

---

## Timeline

- **Week 1**: Backend RBAC implementation
- **Week 2**: Frontend role routing and layouts
- **Week 3**: Billing abstraction
- **Week 4**: Feed compartmentalization
- **Week 5**: Security audit and testing

---

*Classification: Implementation Plan*  
*Last Updated: 2026-02-15*
