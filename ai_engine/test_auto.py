"""Quick test for autonomous controller full lifecycle."""
import time
from autonomous_controller import AutonomousController, AutoState

c = AutonomousController()
c.enable()

# Override decision interval for testing
c.decision_interval = 0.0

for day in range(130):
    c.crop.advance_day(temp_c=20.0, rh_pct=82.5, ppfd=450)
    
    # Force unique timestamps so rate limiter doesn't block
    c.last_decision_time = 0
    status = c.update(1.0)
    
    phase = status["crop"]["phase"]
    health = status["crop"]["health"]
    ripe = status["crop"]["ripe_fraction"] * 100
    state = status["state"]
    
    if day % 20 == 0 or state not in ("growing",):
        print(f"Day {day:3d} | {phase:15s} | HP:{health:.2f} | Ripe:{ripe:5.1f}% | {state}")
    
    if c.state == AutoState.HARVESTING:
        c.last_harvest_result = {
            "picked": 120, "failed": 5, "weight_g": 3000, "efficiency_pct": 96.0
        }
        c.last_decision_time = 0
        c.update(1.0)
        print("--- HARVEST TRIGGERED & COMPLETED ---")
        break

report = c.get_full_report()
print(f"\nYield: {report['metrics']['total_yield_kg']:.3f} kg")
print(f"Cycles: {report['metrics']['total_cycles']}")
print(f"State: {report['state']}")
print(f"Anomalies: {report['anomaly_count']}")
result = "PASS ✅" if report["metrics"]["total_yield_kg"] > 0 else "FAIL ❌"
print(f"\nResult: {result}")
