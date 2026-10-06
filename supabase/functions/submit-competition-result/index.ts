import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server";

const MAX_SUBMITTED_STEPS = 200_000;
const TIME_ZONE = "Asia/Kolkata";

function getIndiaDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default {
  fetch: withSupabase(
    { auth: "user" },
    async (req, ctx) => {
      if (req.method !== "POST") {
        return Response.json({ success: false, error: "Method not allowed." }, { status: 405 });
      }

      try {
        const userId = ctx.userClaims?.id ?? ctx.userClaims?.sub;
        if (!userId) {
          return Response.json({ success: false, error: "Authenticated user ID is missing." }, { status: 401 });
        }

        const body = (await req.json()) as { competition_id?: unknown; steps?: unknown };
        const competitionId = typeof body.competition_id === "string" ? body.competition_id.trim() : "";
        const submittedSteps = typeof body.steps === "number" ? body.steps : Number(body.steps);

        if (!competitionId) {
          return Response.json({ success: false, error: "Competition ID is required." }, { status: 400 });
        }

        if (!Number.isInteger(submittedSteps) || submittedSteps < 0 || submittedSteps > MAX_SUBMITTED_STEPS) {
          return Response.json({
            success: false,
            error: `Steps must be a whole number between 0 and ${MAX_SUBMITTED_STEPS.toLocaleString("en-IN")}.`,
          }, { status: 400 });
        }

        const admin = ctx.supabaseAdmin;
        const now = new Date();

        const { data: competition, error: competitionError } = await admin
          .from("competitions")
          .select("id, name, competition_type, scope, ward_id, status, starts_at, ends_at, category_id")
          .eq("id", competitionId)
          .maybeSingle();

        if (competitionError) {
          console.error("[SUBMIT-COMPETITION] Competition lookup failed", competitionError);
          return Response.json({ success: false, error: "Unable to load the competition." }, { status: 500 });
        }

        if (!competition) {
          return Response.json({ success: false, error: "Competition not found." }, { status: 404 });
        }

        if (competition.status !== "active") {
          return Response.json({ success: false, error: "This competition is not currently active." }, { status: 409 });
        }

        const startsAt = new Date(competition.starts_at);
        const endsAt = new Date(competition.ends_at);
        if (now < startsAt || now >= endsAt) {
          return Response.json({ success: false, error: "This competition is outside its active time window." }, { status: 409 });
        }

        const { data: profile, error: profileError } = await admin
          .from("profiles")
          .select("age, gender, ward_id")
          .eq("id", userId)
          .maybeSingle();

        if (profileError) {
          console.error("[SUBMIT-COMPETITION] Profile lookup failed", profileError);
          return Response.json({ success: false, error: "Unable to verify competition eligibility." }, { status: 500 });
        }

        if (!profile) {
          return Response.json({ success: false, error: "Your Chalega profile could not be verified." }, { status: 403 });
        }

        if (competition.scope === "ward" && profile.ward_id !== competition.ward_id) {
          return Response.json({ success: false, error: "This competition is restricted to the assigned ward." }, { status: 403 });
        }

        if (competition.category_id) {
          const { data: category, error: categoryError } = await admin
            .from("competition_categories")
            .select("id, gender, age_min, age_max, active")
            .eq("id", competition.category_id)
            .maybeSingle();

          if (categoryError) {
            console.error("[SUBMIT-COMPETITION] Category lookup failed", categoryError);
            return Response.json({ success: false, error: "Unable to verify competition category." }, { status: 500 });
          }

          if (
            !category ||
            !category.active ||
            !profile.gender ||
            typeof profile.age !== "number" ||
            profile.age < category.age_min ||
            (category.age_max !== null && profile.age > category.age_max) ||
            profile.gender.toLowerCase() !== category.gender.toLowerCase()
          ) {
            return Response.json({ success: false, error: "Your profile is not eligible for this competition category." }, { status: 403 });
          }
        }

        const { data: participant, error: participantError } = await admin
          .from("competition_participants")
          .select("id, status")
          .eq("competition_id", competitionId)
          .eq("user_id", userId)
          .maybeSingle();

        if (participantError) {
          console.error("[SUBMIT-COMPETITION] Participant lookup failed", participantError);
          return Response.json({ success: false, error: "Unable to verify competition participation." }, { status: 500 });
        }

        if (!participant || participant.status !== "active") {
          return Response.json({ success: false, error: "Join the competition before submitting walking results." }, { status: 403 });
        }

        const resultDate = getIndiaDateKey(now);

        const { data: existingResult, error: existingResultError } = await admin
          .from("competition_results")
          .select("id, verified_steps, rank, status, result_date")
          .eq("competition_id", competitionId)
          .eq("user_id", userId)
          .eq("result_date", resultDate)
          .maybeSingle();

        if (existingResultError) {
          console.error("[SUBMIT-COMPETITION] Existing result lookup failed", existingResultError);
          return Response.json({ success: false, error: "Unable to check your existing competition result." }, { status: 500 });
        }

        if (existingResult) {
          return Response.json({
            success: true,
            already_submitted: true,
            result: existingResult,
            message: existingResult.status === "qualified"
              ? "Your qualified competition result is already recorded."
              : "Your competition result has already been submitted and is awaiting verification.",
          });
        }

        const { data: insertedResult, error: insertError } = await admin
          .from("competition_results")
          .insert({
            competition_id: competitionId,
            user_id: userId,
            result_date: resultDate,
            verified_steps: 0,
            rank: null,
            status: "pending",
          })
          .select("id, competition_id, user_id, result_date, verified_steps, rank, status")
          .single();

        if (insertError) {
          console.error("[SUBMIT-COMPETITION] Result insert failed", insertError);
          return Response.json({ success: false, error: "Your walking result could not be submitted." }, { status: 500 });
        }

        return Response.json({
          success: true,
          already_submitted: false,
          result: insertedResult,
          verification_status: "pending",
          message: "Your walking result has been submitted for verification. It will not affect the podium until it is qualified.",
        });
      } catch (error) {
        console.error("[SUBMIT-COMPETITION] Unexpected error", error);
        return Response.json({ success: false, error: "Unexpected error while submitting the competition result." }, { status: 500 });
      }
    },
  ),
};
