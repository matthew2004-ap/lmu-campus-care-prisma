import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addAudit, getAuth, isCouncil } from '@/lib/auth';

const jsonError = (message: string, status = 400) => NextResponse.json({ error: message }, { status });
const roleIs = (u: any, ...roles: string[]) => u.role === 'council' && roles.includes(u.councilRole || '');
const str = (v: unknown, max = 2000) => String(v ?? '').trim().slice(0, max);
const imageData = (v: unknown) => {
  const s = String(v || '');
  if (!s) return null;
  const match = /^data:image\/(png|jpeg|jpg|webp);base64,((?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?)$/.exec(s);
  const encodedImage = match?.[2];
  const imageSize = encodedImage
    ? encodedImage.length * 3 / 4 - (encodedImage.endsWith('==') ? 2 : encodedImage.endsWith('=') ? 1 : 0)
    : 0;
  if (!match || imageSize > 3_000_000) throw new Error('Images must be PNG, JPG, or WebP and no larger than 3 MB.');
  return s;
};
const profileSelect = { id: true, full_name: true, email: true, matric_no: true, hall: true, avatar_url: true, role: true, council_role: true } as const;

export async function GET() {
  const user = await getAuth();
  if (!user) return jsonError('Please sign in to continue.', 401);
  try {
    const council = isCouncil(user);
    const role = user.councilRole || '';
    const canSeeArrivals = !council || ['welfare', 'transport', 'vcm'].includes(role);
    const canSeeLost = !council || ['pro', 'vcm'].includes(role);
    const canSeeFound = !council || ['pro', 'vcm'].includes(role);
    const canSeeHostel = !council || ['welfare', 'vcm'].includes(role);
    const canSeeGates = !council || ['welfare', 'vcm'].includes(role);
    const studentWhere = council ? {} : { student_id: user.id };
    const [arrivals, gates, lost, found, hostel, audit,courses] = await Promise.all([
      canSeeArrivals ? prisma.arrivalRequest.findMany({ where: !council ? { student_id: user.id } : role === 'transport' ? { delivery_method: 'transport' } : {}, include: { student: { select: profileSelect } }, orderBy: { created_at: 'desc' }, take: 300 }) : Promise.resolve([]),
      canSeeGates ? prisma.gateSchedule.findMany({ where: council ? {} : { active: true }, orderBy: [{ active: 'desc' }, { gate_date: 'asc' }], take: 100 }) : Promise.resolve([]),
      canSeeLost ? prisma.lostReport.findMany({ where: council ? {} : { student_id: user.id }, include: { student: { select: profileSelect } }, orderBy: { created_at: 'desc' }, take: 300 }) : Promise.resolve([]),
      canSeeFound ? prisma.foundItem.findMany({ where: council ? {} : { status: { in: ['available', 'claim_pending', 'claimed'] } }, orderBy: { created_at: 'desc' }, take: 300 }) : Promise.resolve([]),
      canSeeHostel ? prisma.hostelReport.findMany({ where: !council ? { student_id: user.id } : {}, include: { student: { select: profileSelect } }, orderBy: { created_at: 'desc' }, take: 300 }) : Promise.resolve([]),
      role === 'vcm' ? prisma.auditLog.findMany({ orderBy: { created_at: 'desc' }, take: 60 }) : Promise.resolve([]),
      prisma.courseAnnouncement.findMany({
        where: council && role === 'vcm' ? {} : { active: true },
        orderBy: { created_at: 'desc' },
        take: 200,
      }),
    ]);
    return NextResponse.json({ user, council, arrivals, gates, lost, found, hostel, audit, courses });
  } catch (e) { console.error('Campus Care data load:', e); return jsonError('Could not load portal data. Check that the database schema is up to date.', 500); }
}

export async function POST(req: Request) {
  const user = await getAuth();
  if (!user) return jsonError('Please sign in to continue.', 401);
  try {
    const b = await req.json();
    const action = str(b.action, 80);
    const council = isCouncil(user);
    const log = (message: string, severity = 'info') => addAudit(user.id, user.name, message, severity);

    if (action === 'course.create') {
      if (user.role !== 'council' || user.councilRole !== 'vcm') {
        return jsonError(
          'Only the VCM account can publish course announcements.',
          403
        );
      }

      const title = str(b.title, 180);
      const code = str(b.courseCode, 40).toUpperCase();
      const department = str(b.department, 160);
      const level = str(b.level, 20);
      const description = str(b.description, 3000);
      const allowedLevels = ['100L', '200L', '300L', '400L', '500L', 'All levels'];

      if (
        title.length < 3 ||
        code.length < 2 ||
        department.length < 2 ||
        !allowedLevels.includes(level) ||
        description.length < 10
      ) {
        return jsonError(
          'Enter a valid course title, code, department, level, and description.'
        );
      }

      const course = await prisma.courseAnnouncement.create({
        data: {
          title,
          course_code: code,
          department,
          level,
          description,
        },
      });

      await addAudit(
        user.id,
        user.name,
        `Published course announcement: ${code} — ${title}.`
      );

      return NextResponse.json({ ok: true, course }, { status: 201 });
    }

    if (action === 'course.update') {
      if (user.role !== 'council' || user.councilRole !== 'vcm') {
        return jsonError(
          'Only the VCM account can edit course announcements.',
          403
        );
      }

      const id = str(b.id, 80);
      const title = str(b.title, 180);
      const code = str(b.courseCode, 40).toUpperCase();
      const department = str(b.department, 160);
      const level = str(b.level, 20);
      const description = str(b.description, 3000);
      const allowedLevels = ['100L', '200L', '300L', '400L', '500L', 'All levels'];

      if (
        !id ||
        title.length < 3 ||
        code.length < 2 ||
        department.length < 2 ||
        !allowedLevels.includes(level) ||
        description.length < 10
      ) {
        return jsonError('Enter valid course details.');
      }

      const course = await prisma.courseAnnouncement.update({
        where: { id },
        data: {
          title,
          course_code: code,
          department,
          level,
          description,
        },
      });

      await addAudit(
        user.id,
        user.name,
        `Updated course announcement: ${code} — ${title}.`
      );

      return NextResponse.json({ ok: true, course });
    }

    if (action === 'course.delete') {
      if (user.role !== 'council' || user.councilRole !== 'vcm') {
        return jsonError(
          'Only the VCM account can archive course announcements.',
          403
        );
      }

      const id = str(b.id, 80);

      if (!id) {
        return jsonError('Course reference is required.');
      }

      const course = await prisma.courseAnnouncement.update({
        where: { id },
        data: { active: false },
      });

      await addAudit(
        user.id,
        user.name,
        `Archived course announcement: ${course.course_code} — ${course.title}.`
      );

      return NextResponse.json({ ok: true });
    }

    if (action === 'profile.update') {
      if (council) return jsonError('Council profile changes must be made by the administrator.', 403);
      const name = str(b.name, 100); const matric = str(b.matric, 40); const hall = str(b.hall, 100); const avatar = imageData(b.avatar);
      if (name.length < 2 || !matric) return jsonError('Full name and matric number are required.');
      const conflict = await prisma.profile.findFirst({ where: { matric_no: matric, id: { not: user.id } } });
      if (conflict) return jsonError('That matric number is already in use.', 409);
      const updated = await prisma.profile.update({ where: { id: user.id }, data: { full_name: name, matric_no: matric, hall: hall || null, ...(avatar !== null ? { avatar_url: avatar } : {}) }, select: profileSelect });
      await log('Updated student profile.'); return NextResponse.json({ ok: true, user: { ...updated, name: updated.full_name, matric: updated.matric_no, avatar: updated.avatar_url, councilRole: updated.council_role } });
    }

    if (action === 'arrival.create') {
      if (council) return jsonError('Only students can register incoming goods.', 403);
const profile = await prisma.profile.findUnique({
  where: { id: user.id },
  select: { matric_no: true },
});

if (!profile?.matric_no) {
  return jsonError(
    'Please complete your profile and add your matric number before submitting requests.',
    403
  );
}

      const item = str(b.itemDescription, 500); const quantity = Number(b.quantity); const expected = new Date(b.expectedDate);
      if (!item || !Number.isInteger(quantity) || quantity < 1 || quantity > 100 || Number.isNaN(expected.getTime())) return jsonError('Enter an item description, valid quantity, and expected arrival date.');
      const method = b.deliveryMethod === 'transport' ? 'transport' : 'self';
      const record = await prisma.arrivalRequest.create({ data: { student_id: user.id, item_description: item, quantity, notes: str(b.notes, 1500) || null, expected_date: expected, arrival_time: str(b.arrivalTime, 10) || '09:00', delivery_method: method, transport_charge: method === 'transport' ? 1000 : 0, emergency: Boolean(b.emergency), status: 'SUBMITTED', delivery_pin: String(Math.floor(100000 + Math.random() * 900000)) } });
      await log(`Registered incoming goods: ${item}.`); return NextResponse.json({ ok: true, record }, { status: 201 });
    }
    if (action === 'arrival.update') {
      if (!roleIs(user, 'welfare', 'transport', 'vcm')) return jsonError('Only authorised Welfare, Transport, or VCM staff can update package records.', 403);
      const id = str(b.id, 80); const record = await prisma.arrivalRequest.findUnique({ where: { id } }); if (!record) return jsonError('Package record not found.', 404);
      let data: any = {};
      if (roleIs(user, 'welfare', 'vcm')) {
        const allowed = ['SUBMITTED', 'UNDER_INSPECTION', 'READY_FOR_PICKUP', 'IN_TRANSIT', 'DELIVERED', 'ON_HOLD'];
        if (!allowed.includes(b.status)) return jsonError('Invalid package status.');
        data.status = b.status;
        if (Array.isArray(b.contraband)) data.contraband = b.contraband.map((x: unknown) => str(x, 120)).filter(Boolean).slice(0, 30);
        if (b.inspectionNotes !== undefined) data.inspection_notes = str(b.inspectionNotes, 1500) || null;
        if (b.assignedOfficer !== undefined) data.assigned_officer = str(b.assignedOfficer, 100) || null;
        if (b.status === 'IN_TRANSIT' && record.delivery_method !== 'transport') return jsonError('This package was registered for self-pickup.');
      } else {
        if (record.status !== 'IN_TRANSIT') return jsonError('Only packages already in transit can be marked delivered.');
        if (str(b.deliveryPin, 10) !== record.delivery_pin) return jsonError('The delivery confirmation PIN is incorrect.', 403);
        data.status = 'DELIVERED'; data.delivered_at = new Date();
      }
      const updated = await prisma.arrivalRequest.update({ where: { id }, data });
      await log(`Updated package ${id} to ${updated.status}.`); return NextResponse.json({ ok: true, record: updated });
    }
    if (action === 'gate.create') {
      if (!roleIs(user, 'welfare', 'vcm')) return jsonError('Only Welfare or VCM can publish official gate schedules.', 403);
      const date = new Date(b.gateDate); const opening = str(b.openingTime, 10); const closing = str(b.closingTime, 10); const days = Array.isArray(b.days) ? b.days.map((x: unknown) => str(x, 20)).filter(Boolean).slice(0, 7) : [];
      if (Number.isNaN(date.getTime()) || !opening || !closing || days.length === 0) return jsonError('Choose a date, opening and closing times, and at least one working day.');
      if (b.active !== false) await prisma.gateSchedule.updateMany({ where: { active: true }, data: { active: false } });
      const gate = await prisma.gateSchedule.create({ data: { title: str(b.title, 100) || 'Official Gate Date', gate_date: date, opening_time: opening, closing_time: closing, hours: `${opening} - ${closing}`, days, notes: str(b.notes, 1000) || null, published_by: user.id, active: b.active !== false } });
      await log('Published an Official Gate Date schedule.', 'success'); return NextResponse.json({ ok: true, record: gate }, { status: 201 });
    }
    if (action === 'gate.toggle') {
      if (!roleIs(user, 'welfare', 'vcm')) return jsonError('Only Welfare or VCM can manage schedules.', 403);
      const id = str(b.id, 80); const gate = await prisma.gateSchedule.update({ where: { id }, data: { active: Boolean(b.active) } });
      if (gate.active) await prisma.gateSchedule.updateMany({ where: { active: true, id: { not: id } }, data: { active: false } });
      await log(`${gate.active ? 'Activated' : 'Archived'} a gate schedule.`); return NextResponse.json({ ok: true, record: gate });
    }
    if (action === 'lost.create') {
      if (council) return jsonError('Use the P.R.O. workspace to report a found item.', 403);
      const item = str(b.itemName, 160); const location = str(b.location, 200); const description = str(b.description, 2500);
      if (!item || !location || description.length < 10) return jsonError('Enter the item name, last seen location, and a detailed description.');
      const proof = imageData(b.proofImage);
      const report = await prisma.lostReport.create({ data: { student_id: user.id, item_name: item, location, description, proof_url: proof, proof_description: str(b.proofDescription, 1000) || null } });
      await log(`Submitted a lost-item report: ${item}.`); return NextResponse.json({ ok: true, record: report }, { status: 201 });
    }
    if (action === 'found.create') {
      if (council && !roleIs(user, 'pro', 'vcm')) return jsonError('Only P.R.O. or VCM can publish council found-item reports.', 403);
      const item = str(b.itemName, 160); const location = str(b.location, 200); const description = str(b.description, 2000);
      if (!item || !location || description.length < 5) return jsonError('Enter the item name, found location, and description.');
      const image = imageData(b.image);
      const found = await prisma.foundItem.create({ data: { item_name: item, location, description, image_url: image, reported_by: user.id, reporter_type: council ? 'PRO' : 'STUDENT' } });
      await log(`Published a found-item report: ${item}.`); return NextResponse.json({ ok: true, record: found }, { status: 201 });
    }
    if (action === 'found.claim') {
      if (council) return jsonError('Only students can request to claim found items.', 403);
const profile = await prisma.profile.findUnique({
  where: { id: user.id },
  select: { matric_no: true },
});

if (!profile?.matric_no) {
  return jsonError(
    'Please complete your profile and add your matric number before submitting requests.',
    403
  );
}

      const foundId = str(b.foundId, 80); const lostId = str(b.lostId, 80);
      const [found, lost] = await Promise.all([prisma.foundItem.findUnique({ where: { id: foundId } }), prisma.lostReport.findFirst({ where: { id: lostId, student_id: user.id } })]);
      if (!found || !lost) return jsonError('Found item or your lost-item report could not be found.', 404);
      if (found.status !== 'available') return jsonError('This item is no longer available to claim.');
      await prisma.$transaction([prisma.foundItem.update({ where: { id: foundId }, data: { status: 'claim_pending', claimed_by: user.id, matched_lost_report_id: lost.id, claim_note: str(b.note, 1000) || null } }), prisma.lostReport.update({ where: { id: lost.id }, data: { status: 'claim_pending', matched_found_id: found.id } })]);
      await log(`Requested a claim for found item ${found.item_name}.`); return NextResponse.json({ ok: true });
    }
    if (action === 'found.review') {
      if (!roleIs(user, 'pro', 'vcm')) return jsonError('Only P.R.O. or VCM can review item claims.', 403);
      const id = str(b.id, 80); const approve = Boolean(b.approve); const found = await prisma.foundItem.findUnique({ where: { id } });
      if (!found || found.status !== 'claim_pending') return jsonError('There is no pending claim for this item.');
      const status = approve ? 'claimed' : 'available';
      await prisma.foundItem.update({ where: { id }, data: { status, claimed_at: approve ? new Date() : null, claimed_by: approve ? found.claimed_by : null, matched_lost_report_id: approve ? found.matched_lost_report_id : null } });
      if (found.matched_lost_report_id) await prisma.lostReport.update({ where: { id: found.matched_lost_report_id }, data: { status: approve ? 'claimed' : 'open', matched_found_id: approve ? id : null } });
      await log(`${approve ? 'Approved' : 'Rejected'} a found-item claim for ${found.item_name}.`, approve ? 'success' : 'info'); return NextResponse.json({ ok: true });
    }
    if (action === 'hostel.create') {
      if (council) return jsonError('Only students can submit Hostel Watch reports.', 403);
      const profile = await prisma.profile.findUnique({
  where: { id: user.id },
  select: { matric_no: true },
});

if (!profile?.matric_no) {
  return jsonError(
    'Please complete your profile and add your matric number before submitting requests.',
    403
  );
}
      const hall = str(b.hall, 120); const area = str(b.roomArea, 120); const issue = str(b.issueType, 100); const priority = str(b.priority, 20); const description = str(b.description, 2500);
      if (!hall || !area || !issue || description.length < 10 || !['High', 'Medium', 'Low'].includes(priority)) return jsonError('Complete all report fields and provide a detailed description.');
      const report = await prisma.hostelReport.create({ data: { student_id: user.id, hall, room_area: area, issue_type: issue, priority, description } });
      await log(`Submitted a Hostel Watch report: ${issue}.`, priority === 'High' ? 'warning' : 'info'); return NextResponse.json({ ok: true, record: report }, { status: 201 });
    }
    if (action === 'hostel.update') {
      if (!roleIs(user, 'welfare', 'vcm')) return jsonError('Only Welfare or VCM can update Hostel Watch reports.', 403);
      const id = str(b.id, 80); const status = str(b.status, 30);
      if (!['Open', 'In Progress', 'Resolved', 'Rejected'].includes(status)) return jsonError('Invalid report status.');
      const report = await prisma.hostelReport.update({ where: { id }, data: { status, assigned_to: str(b.assignedTo, 100) || null, resolution: str(b.resolution, 1500) || null } });
      await log(`Updated Hostel Watch report ${id} to ${status}.`); return NextResponse.json({ ok: true, record: report });
    }
    return jsonError('Unknown action.');
  } catch (e) {
    console.error('Campus Care action error:', e);
    const message = e instanceof Error ? e.message : 'Request failed.';
    if (message.startsWith('Images must')) return jsonError(message);
    return jsonError('The request could not be completed. Check the fields and database configuration.', 500);
  }
}
