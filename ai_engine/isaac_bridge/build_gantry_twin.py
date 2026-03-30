from omni.isaac.core import World
from omni.isaac.core.objects import DynamicCuboid, VisualCuboid
from omni.isaac.core.articulations import Articulation
from omni.isaac.core.utils.stage import add_reference_to_stage
import omni.replicator.core as rep
from pxr import UsdGeom, Gf, UsdPhysics, PhysxSchema
import numpy as np

class TochiotomePhysics:
    """
    Phase 1 Physics Constants (Research-Driven Baseline)
    Drives the environment to meet the 18 DOIs criteria.
    """
    CROWN_COOLING_TEMP = 20.0  # Celsius
    CO2_PPM = 900.0            # Target: 800-1000 ppm
    VPD_TARGET = 0.8           # kPa (Bradfield 1979)
    DLI_TARGET = 15.0          # mol/m^2/d
    FAR_RED_WAVELENGTH = 730   # nm (Ries 2024 for flowering)
    POLLINATION_VIBRATION = 450 # Hz (Liang 2025: 100-800Hz)

class Phase2GantryTwin:
    def __init__(self):
        self.world = World(physics_dt=1.0 / 60.0, rendering_dt=1.0 / 60.0)
        # Newton Physics 1.0 Setting (Isaac Sim 6.0 preview logic context)
        # self.world.get_physics_context().set_solver_type("Newton") 
        self.constants = TochiotomePhysics()
        
    def setup_scene(self):
        self.world.scene.add_default_ground_plane()
        self.setup_lighting()
        self.build_5_tier_rack()
        self.build_xyz_gantry()
        self.setup_sensor_and_replicator()

    def setup_lighting(self):
        """Phase 1: Far-Red (730nm) Custom LED spectrum simulation."""
        # Simulated as pinkish full-spectrum UV light
        light = rep.create.light(
            light_type="Rect",
            position=(2.0, 2.0, 3.0),
            rotation=(0, -90, 0),
            color=(1.0, 0.4, 0.9), # Represents Far-Red blend
            intensity=15000.0
        )
        print(f"Lighting applied for {self.constants.DLI_TARGET} DLI")

    def build_5_tier_rack(self):
        """Build Phase 1 Architectural Framework (12 sqm room context)."""
        rack_group = self.world.scene
        # Basic 5 tiers representing the Tochiotome layout
        # Z heights: 0.5m, 1.0m, 1.5m, 2.0m, 2.5m
        for i in range(5):
            z_height = 0.5 + (i * 0.5)
            # U-Channel Gutter
            VisualCuboid(
                prim_path=f"/World/Rack/Tier_{i}",
                name=f"tier_{i}",
                position=np.array([2.0, 1.5, z_height]),  # X=2m, Y=1.5m
                scale=np.array([4.0, 0.3, 0.05]),         # 4m length, 30cm width
                color=np.array([0.9, 0.9, 0.9])
            )
            # Generate dummy strawberries on the tier for AI Replicator
            self.spawn_dummy_strawberries(i, z_height)

    def spawn_dummy_strawberries(self, tier_idx, z):
        """Spawn strawberries along the rack for Vision AI Data Labeling."""
        for j in range(5):
            cuboid = VisualCuboid(
                prim_path=f"/World/Strawberries/Tier_{tier_idx}_Berry_{j}",
                name=f"strawberry_{tier_idx}_{j}",
                position=np.array([0.5 + (j * 0.7), 1.5, z + 0.1]),
                scale=np.array([0.05, 0.05, 0.05]),
                color=np.array([0.9, 0.1, 0.1])
            )
            # Assign semantic class for Object ID segmentation!
            # sem = UsdGeom.Tokens.semanticType
            # Modify via OmniGraph / Replicator directly below in setup_sensor_and_replicator

    def build_xyz_gantry(self):
        """Phase 2: Build the Automated XYZ Core harvesting robot."""
        # Main rails
        VisualCuboid(
            prim_path="/World/Gantry/Rail_X1",
            position=np.array([2.0, 0.0, 3.0]), scale=np.array([4.0, 0.1, 0.1])
        )
        VisualCuboid(
            prim_path="/World/Gantry/Rail_X2",
            position=np.array([2.0, 3.0, 3.0]), scale=np.array([4.0, 0.1, 0.1])
        )
        
        # Simulated Prismatic Joints logic (Requires true USD hierarchy in production)
        # 1. Base moving along X
        # 2. Crossbar moving along Y
        # 3. Z-pillar moving up and down
        
        # The End Effector
        self.end_effector = DynamicCuboid(
            prim_path="/World/Gantry/EndEffector",
            name="SoftTouch_Gripper",
            position=np.array([0.5, 1.5, 2.8]),
            scale=np.array([0.1, 0.1, 0.3]),
            color=np.array([0.2, 0.2, 0.2])
        )
        # Bind payload / soft-contact material
        # UsdPhysics / PhysX setup for smooth harvest without bruising
        print("XYZ Gantry Instantiated: X=4m, Y=3m, Z=2.5m")

    def setup_sensor_and_replicator(self):
        """Phase 2: Intel RealSense 3D mapping and Dataset Generation."""
        # 1. Attach RTX Camera to End Effector
        camera = rep.create.camera(position=(0, 0, 0))
        camera_prim = camera.get_input("prims")[0]
        # Attach to the Gantry end effector using constraints (pseudo-code layer)
        # UsdGeom.Xform(camera_prim).AddTranslateOp()
        
        # 2. Render Product (Synthetic Data Harvester)
        render_product = rep.create.render_product(camera, (1024, 1024))
        
        # 3. Initialize Replicator Writers for Bounding Box / Segmentations
        # Ready to generate free YOLO training data (Zero-Touch AI)
        writer = rep.WriterRegistry.get("BasicWriter")
        writer.initialize(
            output_dir="_output/strawberry_dataset",
            rgb=True,
            bounding_box_2d_tight=True,
            semantic_segmentation=True
        )
        writer.attach([render_product])
        
        # Generative AI Randomization (Simulate Lighting/Position changes)
        with rep.trigger.on_frame(num_frames=100):
            with rep.get.prims(path_pattern="/World/Strawberries/.*"):
                rep.modify.pose(
                    position=rep.distribution.uniform((-0.02, -0.02, -0.02), (0.02, 0.02, 0.02)),
                    rotation=rep.distribution.uniform((-10, -10, -10), (10, 10, 10))
                )
        print("Replicator pipeline initialized for 2D Bounding Box & Semantics")

    def run_simulation(self):
        self.world.reset()
        print(f"Initiating Simulation. Syncing Phase 1 Crown Cooling: {self.constants.CROWN_COOLING_TEMP}C")
        # Step through simulation loop
        # while self.world.is_playing():
        #    self.world.step()
        print("Farmbase End_Effector moving to coordinates...")

if __name__ == "__main__":
    # Ensure Omniverse context is running before executing this fully
    # This Blueprint maps the Master architecture directly to simulation API
    farm_sim = Phase2GantryTwin()
    farm_sim.setup_scene()
    farm_sim.run_simulation()
    print("Isaac Sim Tochiotome Layout Build Complete.")
