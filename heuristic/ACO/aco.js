/**
 * @Author: BreezeDust
 * @Date:   2016-07-04
 * @Email:  breezedust.com@gmail.com
* @Last modified by:   BreezeDust
* @Last modified time: 2016-07-10
 */
 require("./lib/zepto.js");
 require("./lib/grid.js");

var Ant=require("./entity/Ant.js");
var World=require("./entity/World.js");
var Position=require("./entity/Position.js");

(function() {
    function initGridBg() {
        var canvas = document.getElementById('gridBg');
        var ctx = canvas.getContext('2d');
        canvas.width=window.innerWidth;
        canvas.height=window.innerHeight;
        console.log(canvas.width, canvas.height,window.innerWidth,window.innerHeight);
        var opts = {
            distance: 20,
            lineWidth: 0.1,
            gridColor: "#fff",
            caption: false
        };
        new Grid(opts).draw(ctx);
    }
    function start(){
        var world;
        var antList=[];
        var isRun=false;
        var isSimulationStarted = false; // 仿真启动标志
        var isSettingsApplied = false; // 参数是否已设置
        function _run(){
            if(!isRun){
                isRun=true;

                // 只在世界初始化后才执行
                if(world && isSettingsApplied){
                    world.volatitlePheromone();

                    // 只在仿真启动后才创建和移动蚂蚁
                    if(isSimulationStarted){
                        if(antList.length<World.ANT_NUMBER){
                            antList.push(new Ant(world));
                        }
                        // console.log("---->");
                        for(var i=0;i<antList.length;i++){
                            antList[i].move();
                        }
                    }
                }

                isRun=false;
            }

            var delay=800;
            setTimeout(function(){
                _run();
            },delay);
        }
        _run();

        // 进入按钮：关闭欢迎页，显示参数设置窗口
        $("#enter").click(function(){
            $("#welcome").hide();
            $("#settingsPanel").show();
        });

        // 设置完成按钮：应用参数，初始化世界，显示开始实验按钮
        $("#setBtn").click(function(){
            // 获取用户设置的参数
            var antNumber = parseInt($("#antNumber").val()) || 50;
            var changeRate = parseFloat($("#changeRate").val()) || 0.02;
            var basePheromone = parseFloat($("#basePheromone").val()) || 1;
            var volatileRate = parseFloat($("#volatileRate").val()) || 0.5;
            var minPheromone = parseFloat($("#minPheromone").val()) || 1;
            var maxPheromone = parseFloat($("#maxPheromone").val()) || 100;

            // 应用参数到World类
            World.ANT_NUMBER = antNumber;
            World.CHANGE_MAX_VALUE = changeRate;
            World.BASE_PHEROMONE = basePheromone;

            // 初始化世界（在参数设置后）
            world = new World(window.innerWidth, window.innerHeight, 20);
            window.world = world;

            // 应用额外参数（需要在world初始化后设置）
            World.volatile = volatileRate;
            World.minPheromone = minPheromone;
            World.maxPheromoneValue = maxPheromone;

            // 隐藏设置面板，显示开始按钮
            $("#settingsPanel").hide();
            $("#startBtn").show();
            isSettingsApplied = true;
        });

        // 开始实验按钮：启动仿真，蚂蚁开始出现
        $("#startBtn").click(function(){
            if(!isSettingsApplied){
                alert("请先设置参数！");
                return;
            }
            isSimulationStarted = true;
            $(this).hide();
        });
    }
    initGridBg();
    start();

})();