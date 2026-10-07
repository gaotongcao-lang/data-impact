# Data^Impact: hosting and operations plan

Researched 8 October 2026 (Pacific/Auckland). Prices in USD, before applicable taxes. These are proposals, not purchased or configured services.

## Current state

- Public review website: https://data-impact.houzeyu40.chatgpt.site
- Private source repository: https://github.com/gaotongcao-lang/data-impact
- Source: index.html, including CSS and JavaScript; no build step or dependencies.
- Projects, people and contact details remain placeholders.
- GitHub commits do NOT automatically update the current Sites deployment.
- No custom domain has been purchased. No Cloudflare, Netlify or Vercel hosting has been configured.
- The current presentation website does not call AI APIs, collect form submissions or store user records.

## Recommendation

Use Cloudflare Pages Free connected to this GitHub repository, with a standard .com domain purchased through Cloudflare Registrar if the chosen name is available at ordinary price. Keep the existing public review site while preparing the permanent deployment. This requires an explicit future decision to connect the hosting account and purchase a domain.

There is no need for a VPS/server for this static site. The hosting provider serves HTML and assets over its CDN and manages infrastructure and TLS. If future projects need Python, persistent databases, user login or paid AI inference, evaluate those workloads separately; this free static hosting estimate does not cover them.

## Options and annual cost

All examples use Cloudflare's current standard .com price, $10.46/year, and GitHub Free ($0). Domain availability and premium pricing have not been checked. Tax, email, API usage, labor and optional add-ons excluded.

| Option | Annual hosting | Annual total with example .com | Why choose it / limitation |
| --- | ---: | ---: | --- |
| Cloudflare Pages Free + GitHub | $0 | $10.46 | Best fit now: static hosting, Git deployments, branch previews, rollback; Free has 500 builds/month and supports public/private repositories. |
| Netlify Free + GitHub | $0 within quota | $10.46 | Convenient previews and future functions; 300 credits/month hard limit, with deploys and traffic sharing this allowance. |
| Netlify Personal, if needed | $108 | $118.46 | 1,000 credits/month; additional usage may cost more if recharge enabled. Full team access and private organization repositories require a suitable Pro plan, currently starting $240/year. |
| Vercel Pro, one paid seat | $240 base | $250.46 base | Better candidate for a future application; additional paid seats and usage can increase cost. Hobby is personal/non-commercial only, so do not assume it fits a developing business brand. |

Planning budgets (NOT currency conversions): reserve NZ$25–40/year for the Cloudflare/free-hosting option; NZ$220–260/year for Netlify Personal; NZ$450–550/year for one-seat Vercel Pro. Check checkout totals, current exchange rate and tax before paying. Multiuser teams and extra usage are outside those budgets. Keep an annual renewal reminder even when auto-renew is on.

A branded mailbox is separate from hosting and domain registration. It is not included above. Initially use an existing verified email address; price a paid mailbox only if the team wants one.

## Domain purchase and management

1. Select a readable name. Data^Impact can remain the visual brand, but ^ is not valid in a conventional domain hostname. Examples to CHECK, not confirmed available: data-impact.com, dataimpactstudio.com.
2. Search availability and check renewal price, not just a first-year promotion. Avoid premium resale prices in the initial budget.
3. Buy in an account owned by the brand owner, with accurate registrant details and a verified email address.
4. Enable automatic renewal, confirm the payment method, and set a separate expiry reminder.
5. Enable registrar lock and DNSSEC, and protect the account with MFA.
6. Record registrar, owner, domain, expiry, renewal cost and DNS provider in an internal asset register.
7. Cloudflare Registrar requires Cloudflare nameservers. It can still point to another hosting provider; using different authoritative nameservers requires changing registrar.
8. Configure apex and www through the hosting provider's custom-domain flow; pick one canonical address and redirect the other. Verify HTTPS and redirects before sharing the permanent URL.

## Publishing with Cloudflare Pages (proposed)

Prepare a clean publish folder so internal operations notes are not served as website files:
- website/index.html (copy the current root index.html here when migrating).
- Keep README.md and OPERATIONS.md outside website/.
- Once migrated, make website/index.html the single source of truth; remove the duplicate root file and update README.

Then:
1. Create a Cloudflare Pages project and authorize ONLY this GitHub repository.
2. Select main as the production branch, use no framework, leave the build command blank, and set build output to website.
3. Deploy and test the generated pages.dev URL.
4. Add the custom domain in Pages before editing DNS.
5. Check apex/www, HTTPS, mobile layout, anchors and reduced-motion behavior.
6. Update README with the permanent URL and the actual automatic-publishing process.
7. Preserve the review URL until the permanent deployment is verified.

Do not apply these migration instructions merely to back up the current site; they are for the future hosting setup.

## Day-to-day update procedure

1. Clone the repository and work on a branch.
2. Edit the website source; open locally or run python3 -m http.server.
3. Open a pull request and inspect the hosting preview (after Git integration is set up).
4. Check desktop/mobile, links, contact details, readable contrast and reduced-motion setting.
5. Have the relevant content owner review it, then merge to main.
6. Check deployment success and the live page.
7. If broken, roll back the hosting deployment immediately, then revert/fix the Git commit so the next deployment does not restore the defect.

Cloudflare supports rollback to a previously successful production deployment. Rollback does not rewrite Git history.

## Security baseline

- Enable MFA/passkeys for GitHub, hosting and registrar; store recovery codes securely outside the repo.
- Invite people with their own accounts and the minimum required role; never share the owner's password.
- Scope hosting GitHub access to data-impact rather than all repositories where possible.
- Keep code private if desired, but assume every browser-delivered HTML/CSS/JS file is readable by visitors. Never put API keys, passwords, private datasets or sensitive contact details into it.
- Only publish consented team biographies and project data.
- Keep HTTPS enabled and check renewal/domain expiry alerts.
- If dependencies, forms or backend APIs are added later, add update checks, server-side validation, rate limits and secret management before launch.
- Consider security headers on the permanent host. Test a Content Security Policy first: the current page contains inline CSS/JS, so a blanket block would break it. Avoid copying an untested policy.
- Review account access and billing quarterly; revoke departing contributors promptly.

## Backup and recovery

- Git history preserves previous source revisions; hosting rollback is a recovery tool, not the only backup.
- Monthly and after major releases: maintain an independent git clone or git bundle in team-controlled backup storage.
- Keep a separate copy of original images/documents, DNS settings, domain register and hosting configuration. Never store credentials in these documents.
- Suggested retention: latest 12 monthly backups plus major releases.
- Twice a year, confirm a backup opens and the site can be served or redeployed from it.
- For this static site there is no database to back up. Add separate database/export backups if one is introduced.
- Source and asset backups should make it possible to move to another static host without rebuilding the website.

## Handoff checklist

Provide the next maintainer:
- GitHub repository and actual live URL.
- Source folder, preview command, deployment branch and output folder.
- Hosting project and account owner.
- Domain registrar, DNS provider, expiry and renewal/payment owner.
- Access invitation to their own account.
- Content owner and contact email.
- Rollback procedure, backup location and last restoration test.
- Known placeholders and any unconnected services.
- Actual billing plan and spend alerts.
- A clear record of whether GitHub changes deploy automatically.

No domain purchase, hosting migration, paid plan or collaborator invitation has been performed as part of this research.

## Primary sources

- Cloudflare Pages pricing: https://www.cloudflare.com/developer-platform/products/pages/
- Cloudflare domain prices: https://pricing.registrar.cloudflare.com/
- Registrar: https://developers.cloudflare.com/registrar/
- Registrar restrictions: https://developers.cloudflare.com/registrar/get-started/register-domain/
- Pages Git integration: https://developers.cloudflare.com/pages/configuration/git-integration/
- Pages limits: https://developers.cloudflare.com/pages/platform/limits/
- Pages domains: https://developers.cloudflare.com/pages/configuration/custom-domains/
- Pages rollback: https://developers.cloudflare.com/pages/configuration/rollbacks/
- Netlify pricing: https://www.netlify.com/pricing/
- Netlify credit plans: https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/
- Vercel pricing: https://vercel.com/pricing
- Vercel Hobby policy: https://vercel.com/docs/plans/hobby
- GitHub pricing: https://github.com/pricing
