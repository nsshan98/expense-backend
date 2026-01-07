# Timezone Implementation Guide

## 1. Auto-Detecting Timezone (Sign Up / Login)

When a user registers or logs in, you should automatically detect their timezone and send it to the backend. This ensures they receive notifications at the correct local time (e.g., 10 AM).

### Frontend Code Snippet (React / JavaScript)

```javascript
// Function to get the user's timezone (e.g., "Asia/Dhaka", "America/New_York")
export const getUserTimezone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

// Example Registration Call
const handleRegister = async (formData) => {
  const payload = {
    ...formData,
    // Automatically attach timezone
    timezone: getUserTimezone(), 
  };

  await axios.post('/auth/register', payload);
};
```

## 2. Manual Update (Settings Page)

If a user moves or wants to change their timezone, provide a dropdown in the User Settings page.

### Getting the List of Timezones
You don't need to hardcode the list. You can generate it dynamically using the browser's API (modern browsers) or use a library like `moment-timezone` or `date-fns-tz`.

#### Option A: Native Browser API (Modern)
```javascript
// Get all supported timezones
const timezones = Intl.supportedValuesOf('timeZone');
// usage: <select>{timezones.map(tz => <option value={tz}>{tz}</option>)}</select>
```

#### Option B: Full List (JSON)

I have created a comprehensive JSON file containing 400+ IANA timezones, **including their current UTC offsets**.

**File Location:** `d:\JS\expense-backend\TIMEZONES.json`

**Data Structure:**
```json
[
  { "value": "Asia/Dhaka", "label": "(UTC+06:00) Asia/Dhaka" },
  { "value": "America/New_York", "label": "(UTC-05:00) America/New_York" }
]
```

**Frontend Usage:**
```javascript
import timezoneList from './path/to/TIMEZONES.json';

// ...
<select>
  {timezoneList.map(tz => (
    <option key={tz.value} value={tz.value}>
      {tz.label}
    </option>
  ))}
</select>
```

*Note: Since offsets are hardcoded in this file, they reflect the time at the moment of generation (January). You may want to regenerate this list purely in the frontend (Option A) if perfect Daylights Savings accuracy is critical year-round without updates.*

*(Note: The backend accepts ANY valid IANA timezone string, e.g., "Asia/Kathmandu", "Europe/Rome", etc.)*
