/**
 * 主模块
 */
var KeyCode = Phaser.KeyCode;
import { Vector } from "./utils.js";
import { createPool } from "./module_loader.js";
/**
 * 画笔
 */
let graphics;
/**
 * 显示在画面左上角的帧率
 */
let fps;
/**
 * 游戏背景图
 */
let background;
/**
 * 主角
 */
let role;
/**
 * 砖块碰撞组
 */
let brickCollisionGroup;
/**
 * 主角碰撞组
 */
let roleCollisionGroup;
/**
 * 子弹精灵组
 */
let bulletGroup;
/**
 * 子弹碰撞组
 */
let bulletCollisionGroup;
/**
 * 子弹对象池
 */
let bulletPool;
/**
 * 主角光环
 */
let effect;
/**
 * 关注的按键
 * @type Object
 */
let concernedKeys;
/**
 * 键盘输入光标
 */
let cursor;
/**
 * 游戏资源预加载
 */
let preload = () => {
    game.load.baseURL = "res/texture/"; //设置基础URL为纹理目录
    game.load.atlasJSONArray("role"); //主角贴图
    game.load.atlasJSONArray("sloweffect"); //慢速移动特效贴图
    game.load.image("st01a"); //关卡背景贴图
};
/**
 * 创建游戏起始对象和相关动画配置等
 */
let create = () => {
    /**
     * 游戏背景和物理引擎设置
     * @type {number}
     */
    game.stage.backgroundColor = 0xdddddd; //设置游戏背景色
    game.physics.startSystem(Phaser.Physics.P2JS); //启动P2物理系统
    //game.physics.p2.gravity.y = 980;//物理系统增加全局重力
    game.physics.p2.restitution = 1; //设置碰撞能量吸收系数
    roleCollisionGroup = game.physics.p2.createCollisionGroup(); //角色碰撞组
    brickCollisionGroup = game.physics.p2.createCollisionGroup(); //其他对象碰撞组
    bulletCollisionGroup = game.physics.p2.createCollisionGroup(); //子弹碰撞组
    game.physics.p2.updateBoundsCollisionGroup(true); //更新碰撞组
    game.physics.p2.setImpactEvents(true); //开启物理事件回调
    /**
     * 创建循环贴图背景
     * @type {Phaser.TileSprite}
     */
    background = game.add.tileSprite(0, 0, game.width * 100, game.height * 100, "st01a");
    background.autoScroll(0, 90);
    /**
     * 创建一堆随机初速度的圆形和矩形
     * @param {number} xnumber 横向的物体个数
     * @param {number} ynumber 纵向的物体个数
     * @param {number} size 每个物体的包围盒大小
     */
    function createBricks(xnumber, ynumber, size) {
        for (let i = 0; i <= xnumber; i++) {
            for (let j = 0; j <= ynumber; j++) {
                graphics = game.add.graphics(i * size, j * size); //增加画笔
                graphics.beginFill(Phaser.Color.HSVColorWheel()[Phaser.Math.roundTo(Phaser.Math.random(1, 359))].color32); //设置画笔填充颜色
                //graphics.beginFill(0x66ccff,1);
                if (j % 2 == 1)
                    graphics.drawCircle(0, 0, size); //绘制圆形
                else
                    graphics.drawRect(-size / 2, -size / 2, size, size); //绘制矩形
                game.physics.p2.enable(graphics, false); //开启物理系统
                if (j % 2 == 1)
                    graphics.body.setCircle(size / 2); //设置碰撞体为圆，默认为矩形
                graphics.body.setZeroDamping(); //设置无阻力
                graphics.body.velocity.x = Math.random() * 50; //随机X速度
                graphics.body.velocity.y = Math.random() * 50; //随机Y速度
                graphics.body.setCollisionGroup(brickCollisionGroup);
                graphics.body.collides([roleCollisionGroup, bulletCollisionGroup]);
                graphics.body.collideWorldBounds = false;
            }
        }
    }
    createBricks(20, 20, 40);
    function createRole() {
        let scale = 4;
        role = game.add.sprite(game.width / 2, game.height - 100, "role"); //增加主角精灵
        role.scale = new Phaser.Point(scale, scale); //精灵大小放缩
        game.physics.p2.enable(role, true); //开启物理系统
        role.body.setCircle(3 * scale);
        role.body.mass = 16; //指定质量
        role.body.motionState = Phaser.Physics.P2.Body.DYNAMIC; //指定碰撞体类型为动态
        role.body.fixedRotation = true; //固定旋转角度，也就是不旋转
        //role.body.data.shapes[0].sensor = true;//关闭碰撞，但是依旧有碰撞检测回调
        role.body.setCollisionGroup(roleCollisionGroup); //设置属于的碰撞组
        role.body.collides([brickCollisionGroup]); //设置要碰撞的组
        role.body.collideWorldBounds = false; //不和世界边界碰撞
        game.world.setBounds(0, 0, game.width * 100, game.height * 100); //设置世界边界，这不会改变画面大小
        game.camera.follow(role); //相机跟随
        /**
         * 光环特效
         * @type {Phaser.Sprite}
         */
        effect = role.addChild(game.make.sprite(0, 0, "sloweffect")); //增加特效精灵作为主角精灵的孩子
        effect.anchor = new Phaser.Point(0.5, 0.5); //设置锚点为正中以匹配主角精灵
        //effect.alpha = 0.8;//设置透明度
        game.add.tween(effect).to({ angle: 360 }, 4000, Phaser.Easing.Default, true, 0, -1); //增加旋转补间动画
        effect["fadeOut"] = game.add.tween(effect).to({ alpha: 0 }, 100, Phaser.Easing.Default, false, 0); //增加淡出动画
        effect["fadeOut"].onComplete.add(() => effect.alpha = 0); //淡出动画结束后设置透明度为0
        effect["fadeIn"] = game.add.tween(effect).to({ alpha: 1 }, 100, Phaser.Easing.Default, false, 0); //增加淡入动画
        effect["fadeIn"].onComplete.add(() => effect.alpha = 1); //动画结束后设置透明度为1
        /**
         * 指定主角的站立、左移、右移动画
         */
        role.animations.add("stand", [0, 1, 2, 3, 4, 5, 6, 7], 8, true); //增加站立动画帧序列
        role.animations.add("left", [11, 12, 13, 14, 15], 16, true); //左移动画
        role.animations.add("beginLeft", [8, 9, 10], 16, false).onComplete.add(() => {
            role.animations.play("left");
        }, this);
        role.animations.add("right", [19, 20, 21, 22, 23], 16, true);
        role.animations.add("beginRight", [16, 17, 18], 16, false).onComplete.add(() => {
            role.animations.play("right");
        }, this);
    }
    createRole();
    bulletGroup = game.add.group(null, null, true, true, Phaser.Physics.P2JS);
    /**
     * 设置键盘输入
     */
    function setupKeyboard() {
        concernedKeys = game.input.keyboard.addKeys({
            "left": KeyCode.LEFT,
            "right": KeyCode.RIGHT,
            "up": KeyCode.UP,
            "down": KeyCode.DOWN,
            "shift": KeyCode.SHIFT,
            "z": KeyCode.Z,
            "space": KeyCode.SPACEBAR
        });
        game.input.keyboard.addKeyCapture(KeyCode.LEFT);
        game.input.keyboard.addKeyCapture(KeyCode.RIGHT);
        game.input.keyboard.addKeyCapture(KeyCode.UP);
        game.input.keyboard.addKeyCapture(KeyCode.DOWN);
        game.input.keyboard.addKeyCapture(KeyCode.SHIFT);
        game.input.keyboard.addKeyCapture(KeyCode.Z);
        game.input.keyboard.addKeyCapture(KeyCode.SPACEBAR);
    }
    setupKeyboard();
    {
        bulletPool = createPool("bullet", {
            create: (x) => {
                let object = { x: 0 };
                object.x = x;
                return object;
            }
        }, {
            init: () => {
                this.x = 0;
            }
        });
        let testo = bulletPool.create(666);
        console.log(testo);
        function fire(x, y, vx, vy) {
            let bullet = game.add.sprite(x || 0, y || 0, "role");
            game.physics.p2.enable(bullet, true);
            bullet.body.setCollisionGroup(bulletCollisionGroup);
            bullet.body.collides([brickCollisionGroup]);
            bullet.body.collideWorldBounds = false;
            bullet.body.velocity.x = vx;
            bullet.body.velocity.y = vy;
        }
    }
    game.time.advancedTiming = true; //允许记录时间信息
    fps = game.add.text(0, 0, "", { fill: "#ff0000", fontSize: 30 }); //显示帧率
    fps.fixedToCamera = true; //固定显示在相机视野
};
/**
 * 每一帧都会执行，处理玩家移动、FPS绘制等
 */
let update = () => {
    /**
     * 处理玩家移动
     */
    function moveRole() {
        if (concernedKeys.left.justDown)
            role.animations.play("beginLeft");
        else if (concernedKeys.right.justDown)
            role.animations.play("beginRight");
        else if (!concernedKeys.left.isDown && !concernedKeys.right.isDown)
            role.animations.play("stand");
        if (concernedKeys.shift.justDown)
            effect["fadeIn"].start();
        else if (concernedKeys.shift.justUp)
            effect["fadeOut"].start();
        else if (concernedKeys.shift.isDown)
            effect.alpha = 1;
        else
            effect.alpha = 0;
        let speed = 1000 * (concernedKeys.shift.isDown ? 0.4 : 1);
        let vector = new Vector(0, 0);
        if (concernedKeys.down.isDown)
            vector.y = 1;
        else if (concernedKeys.up.isDown)
            vector.y = -1;
        if (concernedKeys.right.isDown)
            vector.x = 1;
        else if (concernedKeys.left.isDown)
            vector.x = -1;
        vector.value = speed;
        role.body.velocity.x = vector.x;
        role.body.velocity.y = vector.y;
    }
    moveRole();
    function fire(x, y, vx, vy) {
        let bullet = game.add.sprite(x || 0, y || 0, "role");
        game.physics.p2.enable(bullet, true);
        bullet.body.setCollisionGroup(bulletCollisionGroup);
        bullet.body.collides([brickCollisionGroup]);
        bullet.body.collideWorldBounds = false;
        bullet.body.velocity.x = vx;
        bullet.body.velocity.y = vy;
    }
    if (concernedKeys.space.isDown) {
        //game.add.sprite(role.body.x,role.body.y,"role");
        fire(role.x, role.y, 0, -200);
    }
    //console.log(role.animations.frame);
    fps.text = "Fps:" + game.time.fps;
};
/**
 * 新建游戏
 * @type {Phaser.Game}
 */
let game = new Phaser.Game(800, 800, Phaser.AUTO, "start", { preload: preload, create: create, update: update });
//# sourceMappingURL=main.js.map