// ─── Disposable / Temporary Email Validator ───────────────────────────────────
// Blocks fake/throwaway email addresses at registration.
//
// Two-layer check:
//   1. Domain blocklist  — known temp-email providers (actively maintained list)
//   2. Heuristic signals — structural patterns common in disposable email services
//
// Used in:
//   • app/(auth)/register.tsx        (client-side, immediate feedback)
//   • contexts/AuthContext.tsx       (called before Firebase account creation)
//   • server/routes.ts               (server-side, bypass-proof gate)
// ──────────────────────────────────────────────────────────────────────────────

// ── Known disposable / temporary email domains ────────────────────────────────
// Sources: open-source community blocklists, manual additions from abuse reports.
const DISPOSABLE_DOMAINS = new Set([
  // ── 10-minute / short-lived mail ─────────────────────────────────────────
  "10minutemail.com", "10minutemail.net", "10minutemail.org", "10minutemail.de",
  "10minutemail.co.uk", "10minutemail.us", "10minutemail.be", "10minutemail.pro",
  "10minemail.com", "10minutemail2.com", "10xEmail.com", "20minutemail.com",
  "20minutemail.it", "30minutemail.com",
  // ── Mailinator family ─────────────────────────────────────────────────────
  "mailinator.com", "mailinator.net", "mailinator.org", "mailinator2.com",
  "mailinator2.net", "mailinater.com", "mailnator.com", "mailinanot.com",
  "inoutmail.de", "inoutmail.eu", "inoutmail.net", "inoutmail.info",
  // ── Guerrilla Mail family ─────────────────────────────────────────────────
  "guerrillamail.com", "guerrillamail.net", "guerrillamail.org", "guerrillamail.biz",
  "guerrillamail.de", "guerrillamail.info", "guerrillamailblock.com",
  "spam4.me", "grr.la", "sharklasers.com", "guerrillamailblock.com",
  // ── YopMail ───────────────────────────────────────────────────────────────
  "yopmail.com", "yopmail.fr", "yopmail.net", "yopmail.gq", "yopmail.pp.ua",
  "cool.fr.nf", "jetable.fr.nf", "nospam.ze.tc", "nomail.xl.cx",
  "mega.zik.dj", "speed.1s.fr", "courriel.fr.nf", "moncourrier.fr.nf",
  "monemail.fr.nf", "monmail.fr.nf",
  // ── Trashmail family ──────────────────────────────────────────────────────
  "trashmail.com", "trashmail.net", "trashmail.org", "trashmail.me",
  "trashmail.at", "trashmail.io", "trashmail.xyz", "trashmail.de",
  "trash-mail.com", "trash-mail.at", "trash-mail.de", "trash-mail.io",
  "trash-amil.com", "trashdevil.com", "trashdevil.de",
  "mytrashmail.com", "mt2015.com", "mt2016.com",
  // ── Temp-Mail ─────────────────────────────────────────────────────────────
  "temp-mail.org", "temp-mail.ru", "temp-mail.io", "temp-mail.com",
  "tempmail.com", "tempmail.net", "tempmail.org", "tempmail.de",
  "tempmail.eu", "tempmail.it", "tempmail.us", "tempmail.co",
  "tempr.email", "tempinbox.com", "tempinbox.co.uk",
  "temporaryemail.com", "temporaryemail.net", "temporaryforwarding.com",
  "temporaryinbox.com", "tempe-mail.com", "tempemail.com",
  "tempemail.co.za", "tempemail.net", "tempemail.org",
  "tempalias.com", "temp.emeraldwebmail.com",
  // ── Throwaway / Throw-it ─────────────────────────────────────────────────
  "throwam.com", "throwam.me", "throwaway.email", "throwemall.com",
  "throwemall.com", "throwam.com",
  // ── Dispostable / Maildrop / SpamGourmet ─────────────────────────────────
  "dispostable.com", "disposablemail.com", "disposablemail.de",
  "maildrop.cc", "mailnull.com",
  "spamgourmet.com", "spamgourmet.net", "spamgourmet.org",
  // ── Spam-block services ───────────────────────────────────────────────────
  "spam.org.tr", "spamavert.com", "spambob.com", "spambob.net",
  "spambox.us", "spamcannon.com", "spamcannon.net", "spamcero.com",
  "spamcon.org", "spamcorptastic.com", "spamcowboy.com", "spamcowboy.net",
  "spamcowboy.org", "spamday.com", "spamex.com", "spamfree.eu",
  "spamfree24.de", "spamfree24.eu", "spamfree24.info", "spamfree24.net",
  "spamfree24.org", "spaml.com", "spaml.de", "spammotel.com",
  "spamoff.de", "spamsalted.com", "spamspot.com", "spamthisplease.com",
  "spamtroll.net", "spam.la", "sendspamhere.com",
  "spamherelots.com", "classesmail.com",
  // ── Jetable / Aliased mail ────────────────────────────────────────────────
  "jetable.com", "jetable.fr.nf", "jetable.me", "jetable.net", "jetable.org",
  "jetable.pp.ua", "jetable.ru",
  // ── Fake email generators ─────────────────────────────────────────────────
  "fakeinbox.com", "fakeinbox.net", "fakeinbox.org",
  "fakemail.net", "fakemail.fr", "fakemail.net",
  "fake-email.xyz", "fake-box.com",
  "mailme.lv", "mailme24.com",
  "mailcat.biz", "mailcatch.com", "mailde.de", "mailde.info",
  "mailexpire.com", "mailfa.tk", "mailforspam.com",
  "mailfreeonline.com", "mailhz.me", "mailin8r.com",
  "mailnew.com", "mailscrap.com", "mailseal.de", "mailshell.com",
  "mailsiphon.com", "mailtemp.info", "mailtemporaire.com",
  "mailtemporaire.fr", "mailbucket.org", "mailbidon.com",
  "mail2rss.org", "mail.mezimages.net",
  // ── Guerrilla / Sharklaser aliases ───────────────────────────────────────
  "antispam24.de", "armyspy.com", "caxess.de", "chogmail.com",
  "cuvox.de", "dayrep.com", "einrot.com", "fleckens.hu", "gustr.com",
  "hastetype.com", "hosliy.com",
  // ── Burn-after-reading style ──────────────────────────────────────────────
  "mintemail.com", "myfastmail.com", "myspaceinc.net",
  "mytempemail.com", "mytempmail.com",
  "mvrht.net", "mycleaninbox.net",
  // ── Discard after use ─────────────────────────────────────────────────────
  "discardmail.com", "discardmail.de", "discard.email",
  "disposable.com", "disposable.ml", "disposableaddress.com",
  "disposal.com",
  // ── Nope / no-reply trick domains ─────────────────────────────────────────
  "nospam.ze.tc", "nospamfor.us", "nospamthanks.info", "notsharingmy.info",
  "nowmymail.com", "noblepioneer.com",
  // ── Other well-known services ─────────────────────────────────────────────
  "rcpt.at", "s0ny.net", "safetymail.info", "sanfinder.com",
  "sharklasers.com", "sharedmailbox.org", "shitmail.me", "shitmail.org",
  "shortmail.net", "snakemail.com", "sneakemail.com",
  "filzmail.com", "filzmail.de", "filzmail.ru",
  "spamfighter.cf", "spamfighter.ga", "spamfighter.gq", "spamfighter.ml",
  "spamfighter.tk",
  "vomoto.com", "w3internet.co.uk",
  "walala.org", "walkmail.net", "walkmail.ru",
  "wh4f.org", "whyspam.me", "willhackforfood.biz",
  "wilemail.com", "willselfdestruct.com",
  "wralean.me", "wuzupmail.net",
  "xagloo.com", "xemaps.com", "xents.com", "xmaily.com", "xoxy.net",
  "yep.it", "yogamaven.com", "yomail.info",
  "you-spam.com", "youmail.ga", "yuurok.com",
  "z1p.biz", "zehnminuten.de", "zetmail.com", "zippymail.info",
  "zweb.in", "zxcv.com",
  // ── Common Indian temp-mail services ─────────────────────────────────────
  "tempail.com", "spamevader.com", "spamevader.net",
  "mailtemp.net", "mailtemp.co", "1mail.ml", "1mail.x24hr.com",
  "anonaddy.com", "discard.cf", "discard.ga", "discard.gq", "discard.ml",
  "discard.tk",
  // ── Newer services frequently seen in abuse reports ───────────────────────
  "dropmail.me", "mailnesia.com", "mailnull.com", "mailsac.com",
  "maildeveloper.com", "mailinator.net", "maildu.de",
  "mohmal.com", "moakt.com", "moakt.cc", "moakt.co", "moakt.ws",
  "tnator.com", "tna.so", "sdate.asia", "beefmilk.com",
  "binkmail.com", "bio-muesli.net", "bobmail.info", "bodhi.lawlita.com",
  "bofthew.com", "boun.cr", "br.mintemail.com", "break.cl",
  "breakthru.com", "brefmail.com", "brennendesreich.de", "bspamfree.org",
  "bugmenever.com", "bumpymail.com", "bum.net",
  "casualdx.com", "ce.mintemail.com",
  "cellurl.com", "centermail.com", "centermail.net",
  "chammy.info", "chan.lu", "chapedia.net", "chapedia.org",
  "cheatmail.de", "chewiemail.com",
  "clixser.com", "cloakedmail.com", "cluemail.com",
  "coffeelovers.org", "coid.biz", "consumerriot.com",
  "cool.com", "courriel.fr.nf", "courrieltemporaire.com",
  "crap.kakadua.net", "crapmail.org", "crazymailing.com",
  "crossroadsmail.com", "csh.ro", "curryworld.de",
  "daintly.com", "deadaddress.com", "deadletter.ga",
  "deagot.com", "dealja.com", "despam.it",
  "devnullmail.com", "dfgh.net", "dingbone.com",
  "disposableinbox.com", "dob.jp", "doiea.com",
  "domforfree.com", "dontreg.com", "dontsendmespam.de",
  "dump-email.info", "dumpandfuck.com", "dumpmail.de",
  "dumpyemail.com", "duren.com",
  "e4ward.com", "easytrashmail.com", "edwinhome.com",
  "einmalmail.de", "email60.com", "emailage.cf",
  "emailage.ga", "emailage.gq", "emailage.ml", "emailage.tk",
  "emaildienst.de", "emailigo.com",
  "emailinfive.com", "emailisvalid.com", "emailmiser.com",
  "emailproxsy.com", "emailsensei.com", "emailsingularity.net",
  "emailtemporario.com.br", "emailthe.net", "emailtmp.com",
  "emailwarden.com", "emailx.at.hm", "emailxfer.com",
  "emz.net", "enterto.com", "ephemail.net",
  "etranquil.com", "etranquil.net", "etranquil.org",
  "explodemail.com", "express.net.ua", "expressasia.com",
  "extravagandideas.com",
  "eyepaste.com",
  "facebookmail.gq", "fast-email.com", "fast-mail.fr",
  "fast-mail.org", "fastem.com", "fastemail.us",
  "fastemailer.com", "fastest.cc", "fastimap.com",
  "fastmazda.com", "fastmessaging.com", "fdom.com",
  "fightallspam.com", "filzmail.com", "fixmail.tk",
  "fizmail.com", "fleckens.hu", "flurred.com",
  "flymail.tk", "flyspam.com", "footard.com",
  "forgetmail.com", "forspam.net", "forward.cat",
  "free.pe", "freeola.com", "freeplumbing.com",
  "fuckingduh.com", "fudgerub.com", "fux0ringduh.com",
  "garliclife.com", "gawab.com", "getonemail.com",
  "getnowtoday.cf", "getsmogcheck.com",
  "gfmail.cf", "gfmail.ga", "gfmail.gq", "gfmail.ml", "gfmail.tk",
  "ghostmail.com", "girlsunder.net", "gishpuppy.com",
  "globaltrackmyip.com", "glubex.com", "glucosegrin.com",
  "goemailgo.com", "gol.com", "gorillaswithdirtyarmpits.com",
  "gotmail.com", "gotmail.net", "gotmail.org",
  "graderjs.com", "greenst.info", "gsrv.co.uk",
  "gudanglowongan.com", "gustr.com",
  "h8s.org", "hailmail.net", "hatespam.org",
  "hellodream.mobi", "herp.in", "hidemail.pro",
  "hidzz.com", "highbros.org", "hmail.us",
  "hotemails.net", "hotpop.com", "hulapla.de",
  "ieatspam.eu", "ieatspam.info", "ignoremail.com",
  "ihateyoualot.info", "iheartspam.org",
  "ikbenspamvrij.nl", "imails.info", "inboxclean.com",
  "inboxclean.org", "incognitomail.com", "incognitomail.net", "incognitomail.org",
  "infocom.zp.ua", "insorg.org", "instant-mail.de",
  "ipoo.org", "irish2me.com", "iwi.net",
  "iwmmail.com",
  "jnxjn.com", "jobbery.net",
  "jourrapide.com",
  "jsrsolutions.com", "kasmail.com", "kaspop.com",
  "keepmymail.com", "kiham.com", "killmail.com",
  "killmail.net", "kir.ch.tc", "klassmaster.com",
  "klassmaster.net", "klzlk.com", "koszmail.pl",
  "kurzepost.de", "laafd.com", "lackmail.net",
  "laste.ml", "lazyinbox.com", "letthemeatspam.com",
  "lhsdv.com", "lifebyfood.com", "link2mail.net",
  "litedrop.com", "liveradio.tk", "lol.ovh",
  "lookugly.com", "losemymail.com",
  "lr78.com", "lukecarriere.com", "lukemail.com",
  "lurls.com", "luso.pt",
  "m4ilweb.info", "maboard.com", "mail.by",
  "mail2rss.org", "mail4trash.com", "mailbidon.com",
  "mailblocks.com", "mailbucket.org",
  "mailc.net", "mailchop.com",
  "mailerate.com", "mailerservice.de",
  "mailf5.com", "mailfall.com",
  "mailfilter.com", "mailfreehot.com",
  "mailguard.me", "mailimate.com",
  "maillink.net", "mailmate.com",
  "mailme24.com", "mailmetrash.com",
  "mailmoat.com", "mailnew.com", "mailnull.com",
  "mailorg.org", "mailpick.biz",
  "mailproxsy.com", "mailquack.com",
  "mailreturn.com",
  "mailrobot.com", "mailsand.com", "mailscrap.com",
  "mailshell.com", "mailsiphon.com",
  "mailslapping.com", "mailtemp.info",
  "mailtemporaire.com", "mailtemporaire.fr",
  "mailtm.com",
  "mailtrash.net", "mailtrix.net",
  "mailzilla.com", "mailzilla.org", "malahov.de",
  "manifestgenerator.com", "mantiq.net",
  "markmurfin.com", "mastahype.net",
  "maymusk.com", "mciek.com",
  "meinspamschutz.de", "moncourrier.fr.nf",
  "monemail.fr.nf", "monmail.fr.nf",
  "mox.pp.ua", "msa.minsmail.com",
  "msg.com.au",
  "mt2009.com", "mt2014.com",
  "mucinproducts.com", "munsteradvisors.com",
  "myfastmail.com", "mymail-in.net",
  "myrealbox.com", "myspaceinc.net",
  "n1nja.org", "nakedtruth.biz",
  "namehero.com", "ne.ro", "neomailbox.com",
  "nepwk.com", "nervmich.net", "nervtmich.net",
  "netmails.net",
  "nigge.rs", "nmasmail.com", "nnh.com",
  "nobugmail.com", "noclickemail.com",
  "nonfaxable.com", "nonspam.eu",
  "notmailinator.com", "nowmymail.net",
  "ntlhelp.net", "null.net", "nullbox.info",
  "nwldx.com",
  "objectmail.com", "odaymail.com",
  "oepia.com", "omail.pro", "oneoffmail.com",
  "onewaymail.com",
  "ontyne.biz", "opayq.com",
  "ordinaryamerican.net", "oregonrd.com",
  "owlpic.com",
  "paplease.com", "pecinan.com", "pecinan.net", "pecinan.org",
  "pepbot.com", "pfui.ru", "pjjkp.com",
  "plexolan.de", "pookmail.com",
  "postacin.com", "postemail.net",
  "postinbox.com", "postpro.net",
  "privacy.net", "privatdemail.net",
  "proxymail.eu", "prtnx.com",
  "prydirect.info", "psoxs.com",
  "public-inbox.org", "punchatz.com",
  "punkass.com",
  "qq.com.ai", "quickinbox.com", "quickmail.in",
  "r4nd0m.de", "rakemail.com",
  "randomail.net", "recipeforfailure.com",
  "reddcoin2.com", "reggae.com",
  "rejectmail.com", "reliable-mail.com",
  "revolvingdoorhoax.org",
  "rhyous.com", "rklips.com", "rootfest.net",
  "rowads.com", "royal.net",
  "rppkn.com", "rtrtr.com",
  "ruffrey.com",
  "s0ny.net", "safe-mail.net", "safersignup.de",
  "safetypost.de", "sauver.net",
  "saynotospams.com", "schafmail.de",
  "sdfg.nl", "selfdestructingmail.com",
  "sendspamhere.com",
  "senseless-entertainment.com", "sent.as",
  "sharklasers.com", "shiftmail.com",
  "shippingterms.org",
  "sht.io", "shut.ws", "sibmail.com",
  "skeefmail.com", "slapsfromlastnight.com",
  "slopsbox.com", "slowslow.de",
  "smellfear.com", "snakemail.com",
  "snkmail.com", "socialfurry.org",
  "sofimail.com", "sofort-mail.de",
  "sogetthis.com",
  "solvemail.info", "spam-man.com",
  "spamarrest.com", "spamarrest.com",
  "spamd.de", "spamex.com",
  "spamfighter.cf", "spamfighter.ga",
  "spamfighter.gq", "spamfighter.ml", "spamfighter.tk",
  "spamgoes.in", "spamgourmet.com",
  "spaml.com", "spamoff.de",
  "spamthisplease.com", "spamusers.com",
  "speedymail.org",
  "sq.lc", "sr.itsblur.com",
  "ssl.tls.cloudns.asia",
  "start.tosunkaya.com",
  "subnetwork.com",
  "suremail.info", "svk.jp",
  "talkinator.com", "tapchicongnghe.com",
  "techemail.com",
  "tele2.nl", "tempail.com",
  "tempthe.net", "thankyou2010.com",
  "thanksnospam.info", "theteastick.com",
  "thisisnotmyrealemail.com", "thrma.com",
  "throwam.com", "throwam.me",
  "tilien.com", "timgiarevn.com",
  "tmail.com", "tmailinator.com",
  "toiea.com", "tradermail.info",
  "trash2009.com", "trashdevil.com",
  "trashdevil.de", "trashemail.com",
  "trashinbox.com", "trashmail.at",
  "trbin.com", "trbvm.com",
  "trung.name.vn", "turbin.info", "tyldd.com",
  "uggsrock.com", "uroid.com",
  "valemail.net", "veryrealemail.com",
  "vidchart.com", "vubby.com",
  "wasabisyrup.com", "webemail.me",
  "webm4il.info", "wegwerfmail.de",
  "wegwerfmail.info", "wegwerfmail.net",
  "wegwerfmail.org",
  "whatiaas.com", "whatisaas.com",
  "whyspam.me", "wickmail.net",
  "winemaven.info", "writeme.us",
  "wronghead.com", "wuzupmail.net",
  "xemaps.com", "xents.com",
  "xmaily.com", "xoxy.net",
  "yomail.info", "yogamaven.com",
  "you-spam.com", "youmail.ga",
  "yuurok.com",
  "zain.site", "ze.tc", "zehnminuten.de",
  "zippymail.info", "zkiddie.com",
  "zoemail.com", "zoemail.net",
  "zoemail.org", "zomg.info",
]);

// ── Heuristic: detect patterns common in disposable email services ─────────────
// These catch newer/lesser-known services not yet in the blocklist.
const SUSPICIOUS_PATTERNS = [
  /^(temp|trash|spam|fake|junk|throwaway|discard|noreply|no-reply|mailinator)/i,
  /\d{6,}@/,          // e.g. user123456@domain.com — bot-like
  /(temp|tmp|trash|spam|junk|fake|dispos|throwaway|burner)(mail|email|inbox|box)/i,
];

// ── Known free providers that are sometimes abused but NOT disposable ──────────
// We do NOT block these — too many legitimate users use them.
// gmail.com, yahoo.com, outlook.com, hotmail.com, icloud.com, protonmail.com, etc.

// ── Email format check ────────────────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface EmailValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateEmail(email: string): EmailValidationResult {
  const trimmed = email.trim().toLowerCase();

  // 1. Basic format
  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, reason: "Please enter a valid email address." };
  }

  const parts = trimmed.split("@");
  if (parts.length !== 2) {
    return { valid: false, reason: "Please enter a valid email address." };
  }

  const domain = parts[1];

  // 2. Domain blocklist
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      valid: false,
      reason: "Temporary or disposable email addresses are not allowed. Please use a real email address.",
    };
  }

  // 3. Check subdomains of known disposable services
  //    e.g. xyz.mailinator.com, sub.yopmail.com
  const domainParts = domain.split(".");
  if (domainParts.length >= 3) {
    const parentDomain = domainParts.slice(-2).join(".");
    if (DISPOSABLE_DOMAINS.has(parentDomain)) {
      return {
        valid: false,
        reason: "Temporary or disposable email addresses are not allowed. Please use a real email address.",
      };
    }
  }

  // 4. Heuristic patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        valid: false,
        reason: "This email address doesn't look valid. Please use your real email address.",
      };
    }
  }

  return { valid: true };
}
