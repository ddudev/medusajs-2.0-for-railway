# Email Templates - Testing & Usage Guide

This directory contains all email templates built with React Email, using brand colors and design from the storefront.

## Available Email Templates

1. **Order Confirmation** (`order-placed.tsx`) - Sent when an order is placed
2. **User Invite** (`invite-user.tsx`) - Sent when admin invites a user
3. **Customer Welcome** (`customer-welcome.tsx`) - Sent when a customer registers
4. **Password Reset** (`password-reset.tsx`) - Sent when customer requests password reset

## Brand Design

All templates use the following brand colors from the storefront:

- **Primary Orange**: `#FF6B35` - Used for CTAs and accents
- **Text Primary**: `#1F2937` - Main text color
- **Text Secondary**: `#4B5563` - Secondary text
- **Text Tertiary**: `#9CA3AF` - Muted text
- **Success Green**: `#2D8659` - Success messages
- **Background**: `#F9FAFB` - Page background
- **White**: `#FFFFFF` - Card background
- **Border**: `#E5E7EB` - Borders and dividers

## Testing Email Templates

### 1. Preview Server (Recommended)

Start the React Email preview server to see all templates:

```bash
cd backend
pnpm run email:dev
```

This will start a preview server at `http://localhost:3002` where you can:
- See all templates with live preview
- View on different screen sizes
- Test with sample data
- Send test emails

### 2. Manual Testing

#### Test Welcome Email
1. Register a new customer account on the storefront
2. Check the email inbox for the welcome email
3. Verify:
   - Customer name appears correctly
   - "Start Shopping" button links to storefront
   - Brand colors and logo are visible
   - Email is mobile-responsive

#### Test Password Reset Email
1. Click "Forgot Password?" on the login page
2. Enter your email address
3. Check inbox for reset email
4. Verify:
   - Customer name appears correctly
   - "Reset Password" button works
   - Link expires after 24 hours (test by waiting)
   - Security notice is clear
   - Alternative text link is provided

#### Test Order Confirmation Email
1. Place a test order on the storefront
2. Check email inbox for order confirmation
3. Verify:
   - Order number and date are correct
   - All order items are listed with correct quantities and prices
   - Prices are formatted correctly with currency symbol
   - Shipping address is complete
   - If Econt office delivery: Office name and address are shown
   - If home delivery: Full address is shown
   - Total amount matches the order

### 3. Email Client Testing

Test emails in multiple email clients to ensure compatibility:

**Desktop Clients:**
- Gmail (Chrome, Firefox, Safari)
- Outlook (Web, Desktop)
- Apple Mail
- Thunderbird

**Mobile Clients:**
- Gmail App (iOS, Android)
- Apple Mail App (iOS)
- Outlook App (iOS, Android)

**Dark Mode:**
- Test in both light and dark mode where applicable
- Ensure text remains readable
- Check that colors still look good

### 4. Automated Testing (Optional)

You can use tools like:
- [Litmus](https://litmus.com/) - Email testing across 90+ clients
- [Email on Acid](https://www.emailonacid.com/) - Email testing and analytics
- [Mailtrap](https://mailtrap.io/) - Email testing sandbox

## Environment Variables

Make sure these are set in `backend/.env`:

```bash
# Email Service (choose one)
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@yourstore.com

# OR

SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=noreply@yourstore.com

# Branding
LOGO_URL=https://your-cdn.com/logo.png
COMPANY_NAME=Your Store Name
SUPPORT_EMAIL=support@yourstore.com
STOREFRONT_URL=https://yourstore.com
```

## Common Issues & Troubleshooting

### Emails Not Sending

1. **Check Email Service Configuration**
   - Verify API keys are correct in `.env`
   - Ensure `from` email is verified with your provider
   - Check backend logs for errors

2. **Check Subscribers**
   - Verify subscribers are registered (check backend startup logs)
   - Test by triggering events manually
   - Check notification module is configured in `medusa-config.js`

3. **Check Event Triggers**
   - For welcome email: Ensure `customer.created` event fires
   - For password reset: Verify auth event name (may need adjustment)
   - For order confirmation: Ensure `order.placed` event fires

### Images Not Loading

1. **Logo URL**: Ensure `LOGO_URL` environment variable points to a publicly accessible image
2. **Product Images**: Verify MinIO/CDN URLs are publicly accessible
3. **Test with Email Providers**: Some providers block external images by default

### Styling Issues

1. **Inline Styles**: React Email converts Tailwind to inline styles automatically
2. **Email Client Limitations**: Some CSS features don't work in emails (flexbox, grid)
3. **Tables for Layout**: Use tables for complex layouts in emails (more compatible)

### Links Not Working

1. **Absolute URLs**: Always use full URLs (e.g., `https://yourstore.com/account`)
2. **Token Expiration**: Password reset tokens expire after 24 hours
3. **CORS**: Ensure storefront CORS is configured correctly

## Customization

### Changing Brand Colors

Edit `backend/src/modules/email-notifications/templates/base.tsx` to update brand colors used across all templates.

### Adding New Templates

1. Create new template file (e.g., `order-shipped.tsx`)
2. Export template constant, props interface, and component
3. Add type guard function (`isYourTemplateData`)
4. Update `templates/index.tsx` to include new template
5. Create subscriber to trigger the email
6. Add preview props for testing

### Customizing Existing Templates

Each template exports a `PreviewProps` object for testing. Update this object to see how the template looks with different data.

## Best Practices

1. **Keep It Simple**: Email clients have limited CSS support
2. **Use Inline Styles**: Avoid external stylesheets
3. **Test Thoroughly**: Always test in multiple email clients
4. **Mobile First**: Most emails are read on mobile devices
5. **Clear CTAs**: Make buttons prominent and easy to tap
6. **Alt Text**: Always provide alt text for images
7. **Plain Text Version**: Consider adding plain text fallback
8. **Accessibility**: Use good color contrast and readable font sizes
9. **Legal Requirements**: Include unsubscribe link if applicable
10. **GDPR Compliance**: Be mindful of customer data in emails

## Resources

- [React Email Documentation](https://react.email/docs/introduction)
- [Email Client CSS Support](https://www.campaignmonitor.com/css/)
- [Can I Email](https://www.caniemail.com/) - CSS compatibility checker for email clients
- [MedusaJS Notification Module](https://docs.medusajs.com/resources/commerce-modules/notification)
