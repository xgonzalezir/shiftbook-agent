# BTP Deployment Permissions Guide

## Required Permissions for Deploying to BTP

To successfully deploy the ShiftBook application to SAP BTP (Business Technology Platform), you need specific permissions at different levels.

---

## 1. **BTP Subaccount Level Permissions**

### Minimum Required Role Collections:

#### **Subaccount Administrator** (Recommended for full deployment)
- Grants full administrative access to the subaccount
- Allows creation and management of all resources

#### **Space Developer** (Minimum Required)
- Allows deploying applications to Cloud Foundry spaces
- Can create service instances
- Can bind services to applications

### Role Collections Needed:

| Role Collection | Purpose | Required For |
|----------------|---------|--------------|
| `Subaccount Administrator` | Full subaccount management | Creating services, managing destinations, configuring security |
| `Space Developer` | Deploy apps and manage services in CF space | Deploying MTA archives, creating service instances |
| `Destination Administrator` | Manage BTP Destinations | Creating/editing destinations (email service) |
| `Connectivity and Destination Administrator` | Full destination management | Advanced destination configuration |

---

## 2. **Cloud Foundry Organization & Space Permissions**

### Organization Roles:
- **Org Manager** (optional but helpful)
  - Can manage organization settings
  - Can create spaces
  - Can assign users to spaces

### Space Roles (REQUIRED):
- **Space Developer** ✅ **MANDATORY**
  - Deploy applications (`cf push`, `cf deploy`)
  - Create service instances (`cf create-service`)
  - Bind services to applications
  - View application logs
  - Manage routes

---

## 3. **Service-Specific Permissions**

### XSUAA (Authorization and Trust Management)
- **Space Developer** role allows:
  - Creating XSUAA service instances
  - Updating service configurations
  - Managing role collections (via service configuration)

### HDI Container (HANA Database) - If using HANA
- **Space Developer** role allows:
  - Creating HDI container instances
  - Deploying database artifacts
  - Managing database schemas

### Destination Service
- **Destination Administrator** role allows:
  - Creating destinations
  - Configuring authentication methods
  - Managing destination certificates

---

## 4. **How to Check Your Current Permissions**

### Via BTP Cockpit:
1. Go to **BTP Cockpit** → Your Subaccount (e.g., `manu-dev-org`)
2. Navigate to **Security → Role Collections**
3. Search for your user email
4. Check which Role Collections are assigned

### Via Cloud Foundry CLI:
```bash
# Login to CF
cf login -a https://api.cf.us10-001.hana.ondemand.com

# Check your roles in the current space
cf space-users manu-dev-org dev

# Check your roles in the organization
cf org-users manu-dev-org
```

---

## 5. **Requesting Missing Permissions**

If you don't have the required permissions, you need to request them from your **BTP Administrator**.

### Email Template to Request Permissions:

```
Subject: BTP Permissions Request - ShiftBook Application Deployment

Hi [Administrator Name],

I need to deploy the ShiftBook CAP application to BTP and require the following permissions:

Subaccount: manu-dev-org
Space: dev
User: [your.email@syntax.com]

Required Role Collections:
1. Space Developer (in Cloud Foundry space "dev")
2. Destination Administrator (for email service configuration)

Required Cloud Foundry Roles:
- Space Developer in org "manu-dev-org", space "dev"

Purpose:
- Deploy MTA archive (shiftbook_1.0.0.mtar)
- Create/update XSUAA service instance
- Create/update Destination service instance
- Configure email notification destinations

Please let me know if you need any additional information.

Thank you!
```

---

## 6. **Deployment Commands and Required Permissions**

| Command | Required Permission | Purpose |
|---------|-------------------|---------|
| `cf login` | BTP User Account | Authenticate to Cloud Foundry |
| `cf target -o manu-dev-org -s dev` | Org/Space access | Select target org and space |
| `cf deploy shiftbook_1.0.0.mtar` | **Space Developer** | Deploy MTA archive |
| `cf create-service xsuaa application shiftbook-auth` | **Space Developer** | Create XSUAA service |
| `cf create-service destination lite shiftbook-destination` | **Space Developer** | Create Destination service |
| `cf create-user-provided-service` | **Space Developer** | Create user-provided services |
| `cf push shiftbook-srv` | **Space Developer** | Deploy application |
| `cf logs shiftbook-srv` | **Space Developer** | View application logs |

---

## 7. **Post-Deployment Permissions (Role Assignment)**

After deploying, you need to **manually assign Role Collections to users** in BTP Cockpit:

### Steps:
1. Go to **BTP Cockpit** → `manu-dev-org` subaccount
2. Navigate to **Security → Role Collections**
3. You should see (created automatically by deployment):
   - `shiftbook.operator (shiftbook-srv manu-dev-org-dev)`
   - `shiftbook.admin (shiftbook-srv manu-dev-org-dev)`

4. For each Role Collection:
   - Click on the role collection
   - Click **"Edit"**
   - Add users by email address
   - Click **"Save"**

**Permission Required**: `Subaccount Administrator` or `Role Collection Administrator`

---

## 8. **Troubleshooting Permission Issues**

### Error: "You are not authorized to perform the requested action"
- **Cause**: Missing Space Developer role
- **Solution**: Request Space Developer role from BTP Admin

### Error: "Service instance cannot be created"
- **Cause**: Insufficient quota or missing Space Developer role
- **Solution**: Check space quota and role assignment

### Error: "Cannot update XSUAA service"
- **Cause**: Service owned by different user or insufficient permissions
- **Solution**: Check service ownership with `cf service shiftbook-auth`

### Error: "Route already exists"
- **Cause**: Route conflict or insufficient permissions
- **Solution**: Check existing routes with `cf routes`

---

## 9. **Minimal Permission Set for Initial Deployment**

If you want the **absolute minimum** permissions to deploy:

✅ **MUST HAVE**:
1. **Space Developer** role in CF space `dev`
2. Access to BTP Subaccount `manu-dev-org`

⚠️ **NICE TO HAVE** (for configuration after deployment):
1. **Destination Administrator** - to configure email destinations
2. **Subaccount Administrator** - to assign role collections to users

---

## 10. **Security Best Practices**

### Development Environment:
- Use **Space Developer** role (not Org Manager)
- Limit access to development space only
- Use separate user accounts for production

### Production Environment:
- Use **least privilege principle**
- Separate deployment users from application users
- Use CI/CD pipelines with service accounts
- Regularly audit role assignments

---

## 11. **Current Deployment Configuration**

### Your Setup:
- **Subaccount**: `manu-dev-org`
- **Space**: `dev`
- **Organization**: `manu-dev-org`
- **Region**: `us10-001` (US East)
- **User**: `xavier.gonzalez@syntax.com`

### Services to be Created:
1. `shiftbook-auth` (XSUAA - application plan)
2. `shiftbook-destination` (Destination - lite plan)
3. `shiftbook-db` (HDI Container or PostgreSQL)

### Applications to be Deployed:
1. `shiftbook-srv` (CAP Node.js application)
2. `shiftbook-db-deployer` (Database deployer job)

---

## 12. **Verification Checklist**

Before attempting deployment, verify you have:

- [ ] BTP account credentials
- [ ] Cloud Foundry CLI installed (`cf --version`)
- [ ] MBT (MTA Build Tool) installed (`mbt --version`)
- [ ] Logged into CF: `cf login -a https://api.cf.us10-001.hana.ondemand.com`
- [ ] Targeted correct space: `cf target -o manu-dev-org -s dev`
- [ ] Can list apps: `cf apps` (no permission error)
- [ ] Can list services: `cf services` (no permission error)
- [ ] Space Developer role visible: `cf space-users manu-dev-org dev`

---

## 13. **Quick Permission Check Script**

Run this to check your current permissions:

```bash
#!/bin/bash
echo "=== BTP Permissions Check ==="
echo ""
echo "1. Checking CF login status..."
cf target

echo ""
echo "2. Checking your roles in current space..."
cf space-users $(cf target | grep org | awk '{print $2}') $(cf target | grep space | awk '{print $2}')

echo ""
echo "3. Checking existing services..."
cf services

echo ""
echo "4. Checking existing apps..."
cf apps

echo ""
echo "5. Can you create a test service? (dry run)"
cf marketplace | grep xsuaa
```

Save as `check-permissions.sh`, make executable with `chmod +x check-permissions.sh`, and run with `./check-permissions.sh`.

---

## Summary

**Minimum Required to Deploy**:
- ✅ **Space Developer** role in Cloud Foundry space `dev`
- ✅ BTP account access to subaccount `manu-dev-org`

**Recommended for Full Management**:
- ✅ **Subaccount Administrator** (to assign role collections post-deployment)
- ✅ **Destination Administrator** (to configure email destinations)

**Contact your BTP Administrator** if you're missing any of these permissions.

---

## Next Steps

1. ✅ Verify you have **Space Developer** role
2. ✅ Build MTA archive: `npm run build && mbt build`
3. ✅ Deploy: `cf deploy mta_archives/shiftbook_1.0.0.mtar`
4. ✅ Assign role collections to users in BTP Cockpit
5. ✅ Test the application

---

**Last Updated**: October 7, 2025
**Application**: ShiftBook CAP Application
**Target Environment**: SAP BTP Cloud Foundry (us10-001)
