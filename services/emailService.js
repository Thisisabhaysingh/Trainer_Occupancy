const path = require('path');

const logoPath = path.join(__dirname, '..', 'assets', 'email', 'omotec-logo.webp');
const MIS_URL = 'https://time.onmyowntechnology.com';

const isEmailEnabled = () => {
  return process.env.EMAIL_ENABLED === 'true'
    && process.env.SMTP_USER
    && process.env.SMTP_PASS;
};

const getTransporter = () => {
  if (!isEmailEnabled()) return null;

  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch (error) {
    console.warn('Email disabled: nodemailer is not installed. Run npm install after pulling this change.');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const formatDate = (value) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getItemLabel = (eventType) => {
  if (eventType === 'job') return 'Job';
  if (['task', 'review_submitted', 'review_approved', 'review_redo'].includes(eventType)) return 'Task';
  if (eventType === 'member') return 'Project Membership';
  return 'Item';
};

const buildProjectRows = ({ project, item, roleLabel, eventType }) => {
  const rows = [
    ['Project', project?.name],
    ['Your Role', roleLabel],
    ['Start Date', formatDate(project?.start_date)],
    ['End Date', formatDate(project?.end_date)],
  ];

  if (item?.title) rows.splice(1, 0, [getItemLabel(eventType), item.title]);
  if (item?.dueDate || item?.due_date) rows.push(['Due Date', formatDate(item.dueDate || item.due_date)]);
  if (item?.estimated_hours_new || item?.estimated_hours) rows.push(['Estimated Hours', item.estimated_hours_new || item.estimated_hours]);

  return rows.map(([label, value]) => `
    <tr>
      <td style="padding:8px 12px;border:1px solid #EAECF0;color:#667085;width:150px;">${escapeHtml(label)}</td>
      <td style="padding:8px 12px;border:1px solid #EAECF0;color:#101828;font-weight:600;">${escapeHtml(value || 'Not set')}</td>
    </tr>
  `).join('');
};

const buildHtml = ({ title, intro, project, item, roleLabel, eventType }) => `
  <div style="margin:0;padding:0;background:#F9FAFB;font-family:Arial,Helvetica,sans-serif;color:#101828;">
    <div style="max-width:640px;margin:0 auto;padding:24px;">
      <div style="background:#FFFFFF;border:1px solid #EAECF0;border-radius:8px;overflow:hidden;">
        <div style="padding:20px 24px;border-bottom:1px solid #EAECF0;">
          <img src="cid:omotec-logo" alt="OMOTEC" style="height:48px;width:auto;display:block;" />
        </div>
        <div style="padding:24px;">
          <h2 style="margin:0 0 10px;font-size:20px;line-height:28px;color:#101828;">${escapeHtml(title)}</h2>
          <p style="margin:0 0 18px;font-size:14px;line-height:22px;color:#475467;">${escapeHtml(intro)}</p>
          <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:18px;">
            ${buildProjectRows({ project, item, roleLabel, eventType })}
          </table>
          ${project?.description ? `<p style="margin:0 0 14px;font-size:14px;line-height:22px;color:#475467;"><strong>Description:</strong> ${escapeHtml(project.description)}</p>` : ''}
          ${item?.description ? `<p style="margin:0 0 14px;font-size:14px;line-height:22px;color:#475467;"><strong>Work Details:</strong> ${escapeHtml(item.description)}</p>` : ''}
          <p style="margin:20px 0 0;font-size:12px;line-height:18px;color:#667085;">This is an automated MIS notification from OMOTEC.</p>
        </div>
      </div>
    </div>
  </div>
`;

const sendMail = async ({ to, cc, subject, html }) => {
  if (!to) return { skipped: true, reason: 'missing_recipient' };

  const transporter = getTransporter();
  if (!transporter) return { skipped: true, reason: 'email_disabled' };

  return transporter.sendMail({
    from: process.env.EMAIL_FROM || `"OMOTEC MIS" <${process.env.SMTP_USER}>`,
    to,
    ...(cc && cc.length ? { cc } : {}),
    subject,
    html,
    attachments: [{
      filename: 'omotec-logo.webp',
      path: logoPath,
      cid: 'omotec-logo',
    }],
  });
};

const sendBrandedEmail = async ({ to, subject, title, intro, bodyHtml }) => {
  const html = `
    <div style="margin:0;padding:0;background:#F9FAFB;font-family:Arial,Helvetica,sans-serif;color:#101828;">
      <div style="max-width:640px;margin:0 auto;padding:24px;">
        <div style="background:#FFFFFF;border:1px solid #EAECF0;border-radius:8px;overflow:hidden;">
          <div style="padding:20px 24px;border-bottom:1px solid #EAECF0;">
            <img src="cid:omotec-logo" alt="OMOTEC" style="height:48px;width:auto;display:block;" />
          </div>
          <div style="padding:24px;">
            <h2 style="margin:0 0 10px;font-size:20px;line-height:28px;color:#101828;">${escapeHtml(title)}</h2>
            <p style="margin:0 0 18px;font-size:14px;line-height:22px;color:#475467;">${escapeHtml(intro)}</p>
            ${bodyHtml || ''}
            <p style="margin:20px 0 0;font-size:12px;line-height:18px;color:#667085;">This is an automated MIS notification from OMOTEC.</p>
          </div>
        </div>
      </div>
    </div>
  `;

  return sendMail({ to, subject, html });
};

// Wraps already-safe HTML in the branded layout; used for admin/manager-authored mails.
const sendCustomEmail = async ({ to, cc, subject, bodyHtml }) => sendMail({ to, cc, subject, html: buildCustomEmailHtml(bodyHtml) });

const buildCustomEmailHtml = (bodyHtml) => `
  <div style="margin:0;padding:0;background:#F9FAFB;font-family:Arial,Helvetica,sans-serif;color:#101828;">
    <div style="max-width:640px;margin:0 auto;padding:24px;">
      <div style="background:#FFFFFF;border:1px solid #EAECF0;border-radius:8px;overflow:hidden;">
        <div style="padding:20px 24px;border-bottom:1px solid #EAECF0;">
          <img src="cid:omotec-logo" alt="OMOTEC" style="height:48px;width:auto;display:block;" />
        </div>
        <div style="padding:24px;font-size:14px;line-height:22px;color:#344054;">
          ${bodyHtml || ''}
          <p style="margin:20px 0 0;font-size:12px;line-height:18px;color:#667085;">This is an automated MIS notification from OMOTEC.</p>
        </div>
      </div>
    </div>
  </div>
`;

const buildDetailRows = (rows) => rows
  .filter(([, value]) => value !== undefined && value !== null && value !== '')
  .map(([label, value]) => `
    <tr>
      <td style="padding:8px 12px;border:1px solid #EAECF0;color:#667085;width:150px;">${escapeHtml(label)}</td>
      <td style="padding:8px 12px;border:1px solid #EAECF0;color:#101828;font-weight:600;">${escapeHtml(value || 'Not set')}</td>
    </tr>
  `).join('');

const buildMisAccessBlock = () => `
  <p style="margin:18px 0 0;font-size:14px;line-height:22px;color:#475467;">
    MIS login: <a href="${MIS_URL}" style="color:#175CD3;text-decoration:underline;">time.onmyowntechnology.com</a>
  </p>
`;

const formatRole = (role) => {
  const labels = {
    admin: 'Admin',
    manager: 'Manager',
    teamlead: 'Team Lead',
    employee: 'Employee',
    inventory_admin: 'Inventory Admin',
  };
  return labels[role] || role || 'User';
};

const sendWelcomeEmail = async ({ user, department, branch, defaultPassword = 'password123' }) => {
  if (!user?.email) return { skipped: true, reason: 'user_has_no_email' };

  const bodyHtml = `
    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:18px;">
      ${buildDetailRows([
        ['Full Name', user.name],
        ['Email', user.email],
        ['Employee ID', user.employeeCode],
        ['Role', formatRole(user.role)],
        ['Department', department?.name],
        ['Branch', branch?.name],
        ['Location', branch?.location || department?.location],
        ['Default Password', defaultPassword],
      ])}
    </table>
    <div style="padding:14px 16px;border:1px solid #FEDF89;border-radius:8px;background:#FFFAEB;color:#7A2E0E;font-size:14px;line-height:22px;">
      Please login with the default password and change your password before using MIS.
    </div>
    ${buildMisAccessBlock()}
  `;

  return sendBrandedEmail({
    to: user.email,
    subject: 'Welcome to OMOTEC MIS',
    title: 'Welcome to OMOTEC MIS',
    intro: `Hello ${user.name || user.employeeCode}, your MIS account has been created.`,
    bodyHtml,
  });
};

const sendProfileUpdateEmail = async ({ user, department, branch, changes = [] }) => {
  if (!user?.email) return { skipped: true, reason: 'user_has_no_email' };

  const changedLabels = changes.length
    ? changes.map(change => escapeHtml(change)).join(', ')
    : 'Your employee profile';

  const bodyHtml = `
    <p style="margin:0 0 14px;font-size:14px;line-height:22px;color:#475467;">
      The following profile information was updated: <strong>${changedLabels}</strong>.
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:18px;">
      ${buildDetailRows([
        ['Full Name', user.name],
        ['Email', user.email],
        ['Employee ID', user.employeeCode],
        ['Role', formatRole(user.role)],
        ['Department', department?.name],
        ['Branch', branch?.name],
        ['Location', branch?.location || department?.location],
      ])}
    </table>
    ${buildMisAccessBlock()}
  `;

  return sendBrandedEmail({
    to: user.email,
    subject: 'OMOTEC MIS profile updated',
    title: 'MIS profile updated',
    intro: `Hello ${user.name || user.employeeCode}, your MIS profile details have been updated.`,
    bodyHtml,
  });
};

const notifyProjectEvent = async ({ user, eventType, project, item, roleLabel }) => {
  if (!user?.email) return { skipped: true, reason: 'user_has_no_email' };

  const eventTitles = {
    project: 'New project assigned',
    job: 'New job assigned',
    task: 'New task assigned',
    member: 'Added to project',
    review_submitted: 'Task submitted for review',
    review_approved: 'Task approved',
    review_redo: 'Task redo requested',
  };

  const title = eventTitles[eventType] || 'Project update';
  const subject = `${title}: ${project?.name || 'Project'}`;
  const intro = `Hello ${user.name || user.employeeCode || 'Team Member'}, ${title.toLowerCase()} in MIS.`;

  return sendMail({
    to: user.email,
    subject,
    html: buildHtml({ title, intro, project, item, roleLabel, eventType }),
  });
};

module.exports = {
  isEmailEnabled,
  escapeHtml,
  buildCustomEmailHtml,
  sendCustomEmail,
  notifyProjectEvent,
  sendBrandedEmail,
  sendWelcomeEmail,
  sendProfileUpdateEmail,
};
