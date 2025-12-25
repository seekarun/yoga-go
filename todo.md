NOTES

Misc
[ ] FEAT: add an about me page. should it be a blog post?
[ ] SUBDOMAIN: on expert page the logo flickers in header
[ ] SUBDOMAIN: on expert page login yoga girl flickers in card
[ ] UI: Profile icon is always black. no profile pic.
[ ] LP: redo the value proposition section in landing classic template
[ ] LP: what about photo credit in actual website
[ ] UX: ability to position image (Eg. in hero image)
[ ] TECH: remove excess fields in the user data (like membership)
[ ] UX: set up stipe account alert - check if course is free
[ ] UX: what if you click "create course" when video is uploading 
[ ] UX: does it work on safari? /srv on login does not take you to dashboard
[ ] TECH: welcome email sent from DB trigger
[ ] UI: change unsplash text to be generic. earch for beautiful, free photos to use as your hero background.
[ ] UX: enable/disable when editing a section in landing page edit
[ ] LP: make sure only shown sections in draft make it to published version
[ ] FEAT: privacy and other footer links handled for platform 
[ ] FEAT: privacy and other footer links handled for individuals
[ ] UI: For learner - show enroll button in home page
[ ] FIX: fix rating display. (don't show dummy data)
[ ] FIX: expert commenting on other expert videos shows as EXPERT!!! fix.
[ ] UX: expert should be able to see discussion in admin page.
[ ] FIX: total students not showing the correct number
[ ] UI: add message in dashboard that dns changes takes time.
[ ] UX: setup custom domain email (Remove this section if domain set up already)
[ ] UX: options to raise ticket to add custom domain.
[ ] FEAT: add calendar.
[ ] UI: tell you they can set up their own domain after - all settings - you can change your preference anytime in settings.
[ ] FEAT: what if expert already has a domain email, and want to use that?
[ ] GTM: set up launch.myyoga.guru
[ ] UX: how do we call hero section (etc.) to make this UI more understandable for newbies?
[ ] FIX: in expert dashboard, on save, it should take user back to the same section.
[ ] MAYBE: use formatting option for paragraphs when editing landing page.
[ ] LP: lock hero and footer sections.
[ ] UX: link zoom setting from live session section
[ ] FEAT: marketing/ads
[ ] GTM: expert support - can we get a successful yoga teacher?
[ ] TECH: if user does not verify account in 10 mins, delete from user pool
[ ] TECH: use the lambda email trigger to collect signup stats. consider triggers for other tables.
[ ] FEAT: user testimonials section
[ ] GTM: country specific incremental launches
[ ] UI: disable the next button until the expertID is validated.
[ ] FEAT: buy domain
[ ] FEAT: add language attribute for course
[ ] LP: switching templates should work
[ ] FEAT: better landing page templates set up, expandable
[ ] TECH:handle 404 elegantly
[ ] ONBOARDING: change currency based on location
[ ] FEAT: add payment gateway when setting up course (or some other time after sign up) - confirm subscription before proceeding
[ ] TECH: review currency conversion
[ ] TECH: review all delete endpoints that admin has access to, security, remove any unnecessary

[ ] http to https redirect - check if /etc/hosts still active
[ ] custom domain: prefix with https://
[ ] fix google meet and zoom integration (worked for me)
[ ] cloudflare orange cloud impl
[ ] consider cloudflare email?
[ ] gifting option
[ ] discounts - expert can create discount codes
[ ] localisation
[ ] lock out certain subdomains, like admin, support, etc.
[ ] review code for all fallbacks.
[ ] ability to sell digital assets.


I support expecting mothers through gentle, mindful prenatal yoga designed to nurture both body and baby. My sessions focus on safe movement, breath awareness, and relaxation techniques that ease common pregnancy discomforts, build strength and confidence, and create a deeper connection with your growing baby. Each practice is adaptable, supportive, and centred around your changing needs throughout pregnancy.
Learners can expect to gain greater comfort, strength, and calm throughout pregnancy. Through gentle movement and guided breathing, you’ll build confidence in your changing body, reduce stress and tension, and develop tools to support both pregnancy and birth.


My journey into yoga began during a time when I was searching for balance—physically, mentally, and emotionally. What started as a simple practice to relieve stress soon became a powerful tool for healing, self-awareness, and inner strength. Through yoga, I learned to listen to my body, move with intention, and breathe through life’s challenges both on and off the mat.
Over the years, my personal practice deepened into a calling to teach. I pursued advanced yoga training with a strong focus on anatomy, breathwork, and mindful movement, and later specialised in prenatal yoga after witnessing the profound impact it can have on expecting mothers. Supporting women through pregnancy—helping them feel strong, calm, and connected during such a transformative time—has become the heart of my work.
Today, I bring together years of dedicated practice, ongoing education, and lived experience to create safe, nurturing yoga spaces where learners feel supported at every stage of their journey. My teaching is grounded in compassion, adaptability, and the belief that yoga is for every body.


====================================================================================================================================================================================================
DONE
====================================================================================================================================================================================================

[x] remove logo in expert landing page
[x] payments not showing up in expert dashboard.
[x] move emails to separate table.
[x] link to create courses/surveys/live sessions
[x] remove back button from first screen of on boarding
[x] Duration is confusing
[x] no learner welcome email sent.
[x] email to new expert not working.    
[x] copy buttons for dns record name/value
[x] consider setting up hero section as part of onboarding.
[x] Currency be localized
[x] colour scheme for landing page
[x] onboarding - user location, currency, time zone, brand colours
[x] unique name check for expert (subdomain)
[x] Did not understand level, should all levels be the default?
[x] when coming from /srv set user as an expert
[x] image gallery
[x] dns records add copy button
[x] remove professional title, bio. 
[x] expert ID validate.
[x] expert ID - hint subdomain and email patterns when saved
[x] profile picture optional. 
[x] upload image, start upload as soon as cropped
[x] remove screens for onbaording like "professional details"
[x] sort email hi@myyoga.guru ( also create privacy@myyoga.guru )
[x] razor pay for live sessions
[x] integrate zoom
[x] loading screen
[x] signin with google - myyoga.guru branding
[x] goes to app - fix this
[x] upload video is confusing. 
[x] also, upload in background, go forward.
[x] disable next button until upload complete.
[x] test with all video formats
[x] add blog. 
[x] logout - clean log out should ()
[x] promo video on home page should show up on home page by default
[x] better preview (edit landing page)
[x] call to action button url should be selectable. (survey or courses)
[x] error message does not go away.
[x] cloudflare NS flow - fix domain mismatch bug (was using primaryDomain instead of zone domain)
[x] assets manager
[x] fix profile icon drop down menu
[x] when use lands on dashboard, show link to subdomain and maybe show edit landing page. to update landing page.
[x] do auto-save when editing landing page.
[x] allow expert to disable a section when in the section details UI
[x] about text - AI generation
[x] webinar - did not understand (use live session)
[x] hide footer when using subdomain.
