"use server";

import { revalidatePath } from "next/cache";
import { getRepository } from "@/lib/data";
import { writeAuditLog } from "@/lib/security/audit";
import { requireAuthorizedMutation } from "@/lib/security/guard";
import { parseEuroToCents } from "@/lib/money";
import type { EventCategory, NeededCategory, SchoolEventKind } from "@/lib/domain/types";

function refreshFamily() {
  revalidatePath("/vandaag");
  revalidatePath("/regelen");
  revalidatePath("/kinderen");
  revalidatePath("/agenda");
  revalidatePath("/kosten");
}

export async function updateChildSizesAction(formData: FormData) {
  const childId = String(formData.get("childId") ?? "");
  const { snapshot } = await requireAuthorizedMutation({
    capability: "view_child_basic",
    childId,
    rateLimit: "mutation",
  });
  await getRepository().updateChildSizes({
    childId,
    actorUserId: snapshot.currentProfile.id,
    clothing: String(formData.get("clothing") ?? "") || null,
    shoes: String(formData.get("shoes") ?? "") || null,
    jacket: String(formData.get("jacket") ?? "") || null,
    trousers: String(formData.get("trousers") ?? "") || null,
    sport: String(formData.get("sport") ?? "") || null,
    helmet: String(formData.get("helmet") ?? "") || null,
    other: String(formData.get("other") ?? "") || null,
  });
  refreshFamily();
}

export async function createNeededAction(formData: FormData) {
  const childIdRaw = String(formData.get("childId") ?? "") || null;
  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_tasks",
    childId: childIdRaw,
    rateLimit: "mutation",
  });
  const childId = childIdRaw ?? snapshot.children[0]?.id ?? "";
  const budget = String(formData.get("budget") ?? "");
  await getRepository().createNeededItem({
    familyId: snapshot.family.id,
    createdBy: snapshot.currentProfile.id,
    childId,
    title: String(formData.get("title") ?? ""),
    category: String(formData.get("category") ?? "overig") as NeededCategory,
    size: String(formData.get("size") ?? "") || null,
    dueOn: String(formData.get("dueOn") ?? "") || null,
    assigneeMemberId: String(formData.get("assigneeMemberId") ?? "") || null,
    budgetCents: budget ? parseEuroToCents(budget) : null,
    notes: String(formData.get("notes") ?? "") || null,
    hiddenFromChild: String(formData.get("hiddenFromChild") ?? "") === "true",
    eventId: String(formData.get("eventId") ?? "") || null,
  });
  refreshFamily();
}

export async function claimNeededAction(formData: FormData) {
  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_tasks",
    rateLimit: "mutation",
  });
  await getRepository().claimNeededItem(
    String(formData.get("id") ?? ""),
    snapshot.currentProfile.id,
    snapshot.currentMember.id,
  );
  refreshFamily();
}

export async function purchaseNeededAction(formData: FormData) {
  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_expenses",
    rateLimit: "mutation",
  });
  const price = String(formData.get("price") ?? "");
  const receipt = formData.get("receipt");
  await getRepository().purchaseNeededItem({
    id: String(formData.get("id") ?? ""),
    actorUserId: snapshot.currentProfile.id,
    actorMemberId: snapshot.currentMember.id,
    priceCents: price ? parseEuroToCents(price) : null,
    receiptUrl: receipt instanceof File && receipt.size > 0 ? receipt.name : null,
  });
  refreshFamily();
}

export async function neededToExpenseAction(formData: FormData) {
  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_expenses",
    rateLimit: "mutation",
  });
  const parents = snapshot.members.filter((member) => member.role !== "viewer");
  const me = snapshot.currentMember.id;
  const other = parents.find((member) => member.id !== me)?.id;
  const splitPercents: Record<string, number> = { [me]: 50 };
  if (other) splitPercents[other] = 50;
  await getRepository().neededToExpense({
    id: String(formData.get("id") ?? ""),
    actorUserId: snapshot.currentProfile.id,
    paidByMemberId: me,
    splitPercents,
  });
  refreshFamily();
}

export async function createChildUpdateAction(formData: FormData) {
  const childId = String(formData.get("childId") ?? "");
  const { snapshot } = await requireAuthorizedMutation({
    capability: "view_child_basic",
    childId,
    rateLimit: "mutation",
  });
  const update = await getRepository().createChildUpdate({
    familyId: snapshot.family.id,
    childId,
    body: String(formData.get("body") ?? ""),
    category: String(formData.get("category") ?? "") || null,
    authorMemberId: snapshot.currentMember.id,
  });
  await writeAuditLog(snapshot, {
    action: "create",
    resourceType: "child_update",
    resourceId: update.id,
  });
  refreshFamily();
}

export async function createPartyAction(formData: FormData) {
  const snapshot = (
    await requireAuthorizedMutation({
      capability: "edit_calendar",
      rateLimit: "mutation",
    })
  ).snapshot;
  const date = String(formData.get("date") ?? "");
  const start = String(formData.get("start") ?? "14:00");
  const end = String(formData.get("end") ?? "17:00");
  const childId = String(formData.get("childId") ?? snapshot.children[0]?.id ?? "");
  const budget = String(formData.get("giftBudget") ?? "");
  await getRepository().createEvent({
    familyId: snapshot.family.id,
    createdBy: snapshot.currentProfile.id,
    title: String(formData.get("title") ?? "Kinderfeestje"),
    category: "feestje",
    startsAt: `${date}T${start}:00`,
    endsAt: `${date}T${end}:00`,
    location: String(formData.get("location") ?? "") || null,
    notes: String(formData.get("notes") ?? "") || null,
    packingList: [],
    childIds: [childId],
    memberIds: [String(formData.get("dropoffMemberId") ?? snapshot.currentMember.id)],
    dropoffMemberId: String(formData.get("dropoffMemberId") ?? "") || null,
    pickupMemberId: String(formData.get("pickupMemberId") ?? "") || null,
    party: {
      hostName: String(formData.get("hostName") ?? ""),
      forChildId: childId,
      address: String(formData.get("address") ?? "") || null,
      contact: String(formData.get("contact") ?? "") || null,
      giftBudgetCents: budget ? parseEuroToCents(budget) : null,
      notes: String(formData.get("notes") ?? "") || null,
    },
  });
  refreshFamily();
}

export async function createSchoolMomentAction(formData: FormData) {
  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_calendar",
    rateLimit: "mutation",
  });
  const date = String(formData.get("date") ?? "");
  const kind = String(formData.get("schoolKind") ?? "studiedag") as SchoolEventKind;
  const start = String(formData.get("start") ?? "09:00");
  const end = String(formData.get("end") ?? "15:00");
  const allDay = kind === "studiedag" || kind === "rapport";
  await getRepository().createEvent({
    familyId: snapshot.family.id,
    createdBy: snapshot.currentProfile.id,
    title: String(formData.get("title") ?? "Schoolmoment"),
    category: "school",
    startsAt: allDay ? `${date}T00:00:00` : `${date}T${start}:00`,
    endsAt: allDay ? `${date}T23:59:00` : `${date}T${end}:00`,
    location: String(formData.get("location") ?? "") || null,
    notes: String(formData.get("notes") ?? "") || null,
    packingList: [],
    childIds: formData.getAll("childIds").map(String),
    memberIds: [],
    allDay,
    schoolKind: kind,
  });
  refreshFamily();
}

export async function createTravelAction(formData: FormData) {
  const childIds = formData.getAll("childIds").map(String);
  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_travel",
    childId: childIds[0] ?? null,
    rateLimit: "sensitive",
  });
  const plan = await getRepository().createTravelPlan({
    familyId: snapshot.family.id,
    createdBy: snapshot.currentProfile.id,
    title: String(formData.get("title") ?? "Reis"),
    destination: String(formData.get("destination") ?? ""),
    startsOn: String(formData.get("startsOn") ?? ""),
    endsOn: String(formData.get("endsOn") ?? ""),
    withMemberId: String(formData.get("withMemberId") ?? snapshot.currentMember.id),
    childIds: childIds.length ? childIds : snapshot.children.map((child) => child.id),
    transport: String(formData.get("transport") ?? "") || null,
    stayName: String(formData.get("stayName") ?? "") || null,
    stayAddress: String(formData.get("stayAddress") ?? "") || null,
    stayContact: String(formData.get("stayContact") ?? "") || null,
    bookingRef: String(formData.get("bookingRef") ?? "") || null,
    notes: String(formData.get("notes") ?? "") || null,
    outboundNumber: String(formData.get("outboundNumber") ?? "") || null,
    outboundFrom: String(formData.get("outboundFrom") ?? "") || null,
    outboundTo: String(formData.get("outboundTo") ?? "") || null,
    outboundDeparts: String(formData.get("outboundDeparts") ?? "") || null,
    outboundArrives: String(formData.get("outboundArrives") ?? "") || null,
    returnNumber: String(formData.get("returnNumber") ?? "") || null,
    returnFrom: String(formData.get("returnFrom") ?? "") || null,
    returnTo: String(formData.get("returnTo") ?? "") || null,
    returnDeparts: String(formData.get("returnDeparts") ?? "") || null,
    returnArrives: String(formData.get("returnArrives") ?? "") || null,
  });
  await writeAuditLog(snapshot, {
    action: "create",
    resourceType: "travel_plan",
    resourceId: plan.id,
  });
  refreshFamily();
}

export async function createUpdateOrEventAction(formData: FormData) {
  const category = String(formData.get("category") ?? "overig") as EventCategory;
  if (category === "feestje") {
    await createPartyAction(formData);
    return;
  }
  const { snapshot } = await requireAuthorizedMutation({
    capability: "edit_calendar",
    rateLimit: "mutation",
  });
  await getRepository().createEvent({
    familyId: snapshot.family.id,
    createdBy: snapshot.currentProfile.id,
    title: String(formData.get("title") ?? ""),
    category,
    startsAt: `${String(formData.get("date") ?? "")}T${String(formData.get("start") ?? "09:00")}:00`,
    endsAt: `${String(formData.get("date") ?? "")}T${String(formData.get("end") ?? "10:00")}:00`,
    location: String(formData.get("location") ?? "") || null,
    notes: String(formData.get("notes") ?? "") || null,
    packingList: [],
    childIds: formData.getAll("childIds").map(String),
    memberIds: formData.getAll("memberIds").map(String),
  });
  refreshFamily();
}
