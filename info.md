# Research Findings — Dublin Lions Basketball Club & Club Management

## Dublin Lions Basketball Club
- **Founded**: 2018
- **League**: Irish Domino's Division One
- **Team Colors**: Blue and White
- **Location**: Dublin, Ireland
- **Venue**: Colaiste Bride, New Road Clondalkin, Dublin 22
- **Teams**: Men's team (JOELS Dublin Lions) and Women's team (Abbey Seals Dublin Lions)
- **Instagram**: @dublinlionsbc
- **Website**: http://dublinlions.net/
- **Contact**: Jack Maguire
- **Men's Coach**: Rob White
- **Women's Coach**: Haris Sikorskis
- **Top Players (Men)**: Kevin Anyanwu, Tiago Pereira, Russ Marr, Ignacio Folgueiras, Tieran Howe
- **Top Players (Women)**: Tara Nevin, Emily Smyth, Sinead Keane, Makenzie Helms, Rachel Brennan

## ClubZap Feature Analysis (Reference for Manager Features)
### Core Membership Management
- Member database with secure storage
- Automated renewals and payment collection
- Online registration and custom forms
- Payment tracking (who paid, who is overdue, who lapsed)
- Membership status dashboard (Paid / Pending / Pending Renewal)
- Year-on-year comparison reports
- Member engagement analytics

### Payment Features
- Monthly payment plans (instalments)
- One-time full payments
- Auto-recovery of failed payments (95% recovery rate)
- Payment status overview for coaches
- Financial reporting and revenue tracking
- Fundraising integration (lotto, draws, merchandise)

### Communication
- Push notifications to app
- Group messaging (replace WhatsApp chaos)
- News and announcements
- Targeted communication (contact specific coaches about unpaid members)

### Team/Squad Management
- Squad reports for coaches
- Attendance tracking
- Member registration status (registered with governing body vs not)
- Groups and team management

### Reporting & Analytics
- Weekly membership reports (new signups, revenue, registered vs not)
- Attendance analytics
- Engagement tracking
- Financial summaries

## Basketball Club Website Best Practices
- Strong branding with team colors (blue/white for Dublin Lions)
- Hero section with action imagery
- Schedule/fixtures section
- Team rosters with player photos
- Online registration with payments
- News/announcements
- Sponsorship section
- Mobile-responsive design

## Stripe Integration Notes
- Use Stripe TEST mode
- Products needed: Monthly Membership, Per-Session Payment
- Checkout sessions for one-time payments
- Subscription sessions for recurring monthly
- Webhook handling for payment confirmation
- Payment status tracking in database
