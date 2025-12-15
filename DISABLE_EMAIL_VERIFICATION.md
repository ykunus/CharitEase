# 🔓 Disable Email Verification in Supabase

## Why Disable Email Verification?

For development and testing, you may want accounts to be usable immediately without requiring email confirmation. This allows you to:
- ✅ Test account creation and sign-in flows quickly
- ✅ Avoid checking email during development
- ✅ Create accounts and use them right away

## 📋 Steps to Disable Email Verification

### 1. Go to Supabase Dashboard
1. Visit [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Select your project

### 2. Navigate to Authentication Settings
1. Click on **Authentication** in the left sidebar
2. Click on **Settings** (or go to **Configuration** → **Auth**)

### 3. Disable Email Confirmation
1. Find the section **"Email Auth"** or **"Email Confirmation"**
2. Look for the toggle/checkbox: **"Enable email confirmations"**
3. **Turn it OFF** (uncheck the box)
4. Click **Save** or the changes will auto-save

### 4. Verify the Setting
- The setting should now show as **OFF** or **Disabled**
- New accounts created will be immediately usable without email confirmation

## ✅ What This Changes

**Before (Email Confirmation ON):**
- User signs up → Account created but not active
- User must check email and click confirmation link
- User can then sign in

**After (Email Confirmation OFF):**
- User signs up → Account created and immediately active
- User is automatically signed in
- No email confirmation needed

## 🔒 Security Note

⚠️ **Important**: Disabling email verification means:
- Anyone with an email address can create an account
- No verification that the email is real/accessible
- Less secure for production use

**Recommendation**: 
- ✅ **Disable** for development/testing
- ⚠️ **Enable** for production (better security)

## 🧪 Testing

After disabling email confirmation:

1. **Create a new charity account**
2. **You should be automatically signed in**
3. **No email confirmation needed**
4. **Account should work immediately**

If you still see issues:
- Check the console logs for any errors
- Verify the Supabase setting was saved
- Try creating a new account after disabling the setting


