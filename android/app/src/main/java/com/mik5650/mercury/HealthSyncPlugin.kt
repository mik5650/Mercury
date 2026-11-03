package com.mik5650.mercury

import android.content.Intent
import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.Record
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.records.metadata.Metadata
import androidx.health.connect.client.units.Energy
import androidx.health.connect.client.units.Mass
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import java.time.Instant
import java.time.ZoneId
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * Health Connect: sends finished workouts (strength training sessions + estimated active
 * calories) and weigh-ins. Write-only. Records carry a stable client id, so sending one
 * again updates it instead of adding a duplicate.
 */
@CapacitorPlugin(name = "HealthSync")
class HealthSyncPlugin : Plugin() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val contract = PermissionController.createRequestPermissionResultContract()

    private val permissions = setOf(
        HealthPermission.getWritePermission(ExerciseSessionRecord::class),
        HealthPermission.getWritePermission(ActiveCaloriesBurnedRecord::class),
        HealthPermission.getWritePermission(WeightRecord::class),
    )

    override fun handleOnDestroy() {
        scope.cancel()
    }

    /** "available" | "update" (Health Connect needs installing or updating) | "unavailable" */
    @PluginMethod
    fun availability(call: PluginCall) {
        val status = when (HealthConnectClient.getSdkStatus(context)) {
            HealthConnectClient.SDK_AVAILABLE -> "available"
            HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "update"
            else -> "unavailable"
        }
        call.resolve(JSObject().put("status", status))
    }

    @PluginMethod
    fun hasAccess(call: PluginCall) {
        val client = client(call) ?: return
        scope.launch {
            try {
                val granted = client.permissionController.getGrantedPermissions()
                call.resolve(JSObject().put("granted", granted.containsAll(permissions)))
            } catch (e: Exception) {
                call.reject(e.message ?: "Health Connect error", e)
            }
        }
    }

    @PluginMethod
    fun requestAccess(call: PluginCall) {
        if (client(call) == null) return
        startActivityForResult(call, contract.createIntent(context, permissions), "accessResult")
    }

    @ActivityCallback
    private fun accessResult(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        val granted = contract.parseResult(result.resultCode, result.data)
        call.resolve(JSObject().put("granted", granted.containsAll(permissions)))
    }

    /** workouts: [{ id, start, end, title, kcal? }] (epoch ms) */
    @PluginMethod
    fun writeWorkouts(call: PluginCall) {
        val client = client(call) ?: return
        val list = call.getArray("workouts") ?: return call.reject("Missing workouts")
        val records = mutableListOf<Record>()
        for (i in 0 until list.length()) {
            val w = list.getJSONObject(i)
            val id = w.getString("id")
            val start = Instant.ofEpochMilli(w.getLong("start"))
            val end = Instant.ofEpochMilli(w.getLong("end"))
            val zone = ZoneId.systemDefault().rules
            records += ExerciseSessionRecord(
                startTime = start,
                startZoneOffset = zone.getOffset(start),
                endTime = end,
                endZoneOffset = zone.getOffset(end),
                metadata = Metadata.manualEntry(clientRecordId = "mercury-session-$id", clientRecordVersion = 1),
                exerciseType = ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING,
                title = w.optString("title").ifEmpty { null },
            )
            val kcal = w.optDouble("kcal", 0.0)
            if (kcal > 0) {
                records += ActiveCaloriesBurnedRecord(
                    startTime = start,
                    startZoneOffset = zone.getOffset(start),
                    endTime = end,
                    endZoneOffset = zone.getOffset(end),
                    energy = Energy.kilocalories(kcal),
                    metadata = Metadata.manualEntry(clientRecordId = "mercury-kcal-$id", clientRecordVersion = 1),
                )
            }
        }
        insert(call, client, records)
    }

    /** weights: [{ time, kg }] (epoch ms) */
    @PluginMethod
    fun writeWeights(call: PluginCall) {
        val client = client(call) ?: return
        val list = call.getArray("weights") ?: return call.reject("Missing weights")
        val records = mutableListOf<Record>()
        for (i in 0 until list.length()) {
            val w = list.getJSONObject(i)
            val time = Instant.ofEpochMilli(w.getLong("time"))
            records += WeightRecord(
                time = time,
                zoneOffset = ZoneId.systemDefault().rules.getOffset(time),
                weight = Mass.kilograms(w.getDouble("kg")),
                // One weigh-in per day: a new value for the same day replaces the old one
                metadata = Metadata.manualEntry(clientRecordId = "mercury-weight-${w.getString("date")}", clientRecordVersion = w.getLong("version")),
            )
        }
        insert(call, client, records)
    }

    @PluginMethod
    fun openSettings(call: PluginCall) {
        val intent = Intent(HealthConnectClient.ACTION_HEALTH_CONNECT_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try {
            context.startActivity(intent)
            call.resolve()
        } catch (e: Exception) {
            call.reject("Health Connect settings unavailable", e)
        }
    }

    private fun insert(call: PluginCall, client: HealthConnectClient, records: List<Record>) {
        if (records.isEmpty()) return call.resolve(JSObject().put("count", 0))
        scope.launch {
            try {
                records.chunked(100).forEach { client.insertRecords(it) }
                call.resolve(JSObject().put("count", records.size))
            } catch (e: SecurityException) {
                call.reject("No access", "NO_ACCESS", e)
            } catch (e: Exception) {
                call.reject(e.message ?: "Health Connect error", e)
            }
        }
    }

    private fun client(call: PluginCall): HealthConnectClient? {
        if (HealthConnectClient.getSdkStatus(context) != HealthConnectClient.SDK_AVAILABLE) {
            call.reject("Health Connect isn't available", "UNAVAILABLE")
            return null
        }
        return HealthConnectClient.getOrCreate(context)
    }
}
